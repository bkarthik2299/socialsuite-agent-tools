import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { readFile, stat } from 'node:fs/promises';
import { extname, isAbsolute } from 'node:path';
import { callAgentApi, textResult } from './gateway.js';
import { config } from './config.js';

const id = z.string().uuid();
const text = z.string().max(10000);
const cell = z.union([text, z.number().finite(), z.null()]);
export const reportPeriodSchema = z.object({ start: z.iso.date(), end: z.iso.date() }).refine(
  p => p.end >= p.start && Date.parse(p.end) - Date.parse(p.start) <= 365 * 86400000,
  'Choose an inclusive reporting period of up to 366 days.',
);
const logo = z.union([z.literal(''), z.url().startsWith('https://').max(2048)]);
export const reportColumnSchema = z.object({
  id, label: z.string().trim().min(1).max(100),
  kind: z.enum(['manual', 'connected', 'calculated']),
  field: z.enum(['text', 'number', 'currency', 'percentage', 'date', 'status']),
  defaultValue: cell.optional(), options: z.array(z.string().max(100)).max(50).optional(),
  formula: z.string().max(1000).optional(), mappingId: id.optional(),
  metric: z.string().max(200).optional(), aggregation: z.enum(['sum', 'period']).optional(),
  width: z.number().min(80).max(600).optional(), currency: z.string().regex(/^[A-Z]{3}$/).optional(),
});
export const reportDatasetSchema = z.object({
  id, grain: z.enum(['total', 'month', 'campaign', 'custom']),
  columns: z.array(reportColumnSchema).max(50),
  rows: z.array(z.object({ id, label: z.string().max(200), period: z.string().max(30), hidden: z.boolean().optional() })).max(5000),
  values: z.record(z.string().max(300), z.record(id, cell)), totals: z.boolean(),
  filter: z.string().max(200).optional(), sort: id.optional(),
  descending: z.boolean().optional(), hiddenKeys: z.array(z.string().max(300)).max(5000).optional(),
  layout: z.enum(['horizontal', 'transposed']).describe('Saved table orientation: horizontal or Vertical (stored as transposed). Preserve on edits. Image snapshots always use the vertical layout independently.').optional(),
  recordHeading: z.string().trim().max(100).optional(),
  rowLabels: z.record(
    z.string().max(300).regex(/^(?:total$|month:\d{4}-\d{2}$|campaign:.+)/),
    z.string().trim().min(1).max(200),
  ).refine(labels => Object.keys(labels).length <= 5000, 'Up to 5,000 row names are supported').optional(),
});
export const reportDocumentSchema = z.object({
  name: z.string().trim().min(1).max(160), description: text,
  period: reportPeriodSchema, comparison: z.enum(['none', 'previous', 'year']),
  branding: z.object({
    agencyLogo: logo, clientLogo: logo, accent: z.string().regex(/^#[a-f\d]{6}$/i),
    font: z.enum(['Inter', 'Georgia', 'Arial']), footer: z.string().max(500),
  }),
  blocks: z.array(z.object({
    id, type: z.enum(['table', 'kpi', 'chart', 'text', 'heading', 'divider']),
    title: z.string().max(200), description: text, internal: z.boolean(),
    tableId: id.optional(), columnId: id.optional(), chart: z.enum(['line', 'bar', 'donut']).optional(),
    text: text.optional(), target: z.number().finite().optional(),
    calculation: z.object({
      expression: z.string().min(1).max(1000), format: z.enum(['number', 'currency', 'percentage']),
      currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    }).optional(),
  })).max(100),
});

export function registerReports(server: McpServer) {
  const tool = (action: string, description: string, schema: Record<string, z.ZodType>, readOnly = false, destructive = false) =>
    server.registerTool(`socialsuite_${action}`, {
      description, inputSchema: schema,
      annotations: { readOnlyHint: readOnly, destructiveHint: destructive, openWorldHint: action === 'reports_publish' },
    }, async input => textResult(await callAgentApi(action, input)));
  const report = { reportId: id };
  const client = { clientId: id };
  tool('reports_list', 'List DIY Reports in the active workspace, including client IDs, document metadata, revisions and saved share versions.', {}, true);
  tool('reports_get', 'Read the latest saved report, all datasets, current revision, versions and sharing state before editing. Use the saved revision as the base for edits. Share tokens are private.', report, true);
  tool('reports_catalog', 'Discover live Reports bindings for this Analytics client. Use the returned mappingId, metric key, field, aggregation, currency and supported grains. Account totals such as GA4 sessions are all-channel metrics. Read GA4 Organic Search and SE Ranking keyword rows with analytics_dashboard detail for dated manual snapshots. Treat unavailable values as missing.', client, true);
  tool('reports_defaults', 'Read agency/project branding defaults for a new DIY Report.', client, true);
  tool('reports_branding_assets', 'Read selectable logos from the client’s linked project Brand Guide. Otherwise use reports_upload_logo with a normal local image file.', client, true);
  tool('reports_data', 'Read connected metric cache, job status and warnings for the saved report. Missing cache can queue existing Analytics sync; poll with a delay until ready. Manual values stay in reports_get datasets.', report, true);
  tool('reports_version', 'Read one immutable shared report presentation, including its frozen branding, tables, KPI cards and charts.', { ...report, versionId: id }, true);
  tool('reports_save', 'Create or atomically save a complete DIY Report. For a new report supply a new UUID reportId and revision -1. For edits, first call reports_get and use its exact revision. On a conflict, read the latest saved report and reapply the requested edits. Preserve existing blocks and data when a requested binding is unavailable. Use catalog metrics for live bindings and label any approved dashboard imports as dated manual snapshots. Keep website leads pending until lead-specific data supports the requested attribution. Preserve stable IDs and layout (horizontal or transposed). Share separately when requested. See the Reports skill reference for formulas, value keys and examples.', {
    ...report, ...client, revision: z.number().int().min(-1), document: reportDocumentSchema,
    datasets: z.array(reportDatasetSchema).max(50),
  }, false, true);
  tool('reports_refresh', 'Explicitly refresh connected Analytics for a saved DIY Report, preserving manual inputs. Uses existing provider cooldowns. Poll reports_data for job errors and readiness.', report);
  tool('reports_duplicate', 'Copy a report structure to a new period/client with new report, dataset and block IDs. Business values and commentary are cleared. Another-client copies also clear connected mappings and the client logo. Remap from the destination catalog before sharing.', { ...report, ...client, period: reportPeriodSchema });
  const shareInput = { ...report, acknowledgeMissing: z.boolean().optional() };
  server.registerTool('socialsuite_reports_share', {
    description: 'Create or copy an authorized report preview link that anyone can open without signing in. Returns url, snapshotUrl (the vertical JPEG image), message (text with the report link) and status. If a link already exists, return it as-is. Set updatePreview when asked to share the latest saved report at that same link. The browser Share dialog prepares the latest saved preview automatically and offers View snapshot, Copy image & text and WhatsApp; MCP returns assets without opening chats or writing the clipboard. Review missing-data warnings before acknowledging them. Keep both URLs private to intended recipients.',
    inputSchema: { ...shareInput, updatePreview: z.boolean().optional() },
    annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: true },
  }, async ({ reportId, updatePreview, acknowledgeMissing }) => {
    const appUrl = URL.canParse(config.appUrl) ? new URL(config.appUrl) : null;
    if (!appUrl || !['http:', 'https:'].includes(appUrl.protocol) || appUrl.username || appUrl.password) {
      throw new Error('Configure a valid SOCIALSUITE_APP_URL before sharing.');
    }
    const { share } = await callAgentApi<{ share?: { token: string; revoked: boolean } | null }>('reports_get', { reportId });
    const active = share && !share.revoked;
    const { token } = active && !updatePreview
      ? share
      : await callAgentApi<{ token: string }>('reports_publish', { reportId, acknowledgeMissing });
    const url = new URL(`/shared-reports/${encodeURIComponent(token)}`, appUrl).href;
    const snapshotUrl = new URL(`/shared-report-preview/${encodeURIComponent(token)}`, appUrl).href;
    return textResult({ url, snapshotUrl, message: `Here’s the report.\n${url}`, status: active ? (updatePreview ? 'updated' : 'existing') : 'created' });
  });
  tool('reports_publish', 'Compatibility tool for clients that need the legacy share token. Use reports_share for current workflows. This action creates or updates a public preview link and requires authorization. Review missing data before acknowledging warnings.', shareInput, false, true);
  tool('reports_revoke', 'Turn off the report’s public preview link. Creating a link again generates a new token.', report, false, true);
  tool('reports_delete', 'Permanently delete a report, its datasets and saved share versions. Obtain explicit confirmation at action time. Use reports_save to remove a block or clear a field.', report, false, true);
  server.registerTool('socialsuite_reports_upload_logo', {
    description: 'Upload a local PNG/JPG/WebP logo (max 2 MB) for this report. filePath must be absolute on the MCP server machine. Returns a stored logo URL to assign to clientLogo or agencyLogo in reports_save; does not change the report or publish it. Never ask the user for a logo URL.',
    inputSchema: { ...report, filePath: z.string().min(1) },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
  }, async ({ reportId, filePath }) => {
    if (!isAbsolute(filePath)) throw new Error('filePath must be absolute on the MCP server machine.');
    const mime = ({ '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' } as Record<string, string>)[extname(filePath).toLowerCase()];
    if (!mime) throw new Error('Choose a PNG, JPG or WebP logo.');
    const info = await stat(filePath);
    if (!info.isFile() || info.size <= 0 || info.size > 2 * 1024 * 1024) throw new Error('Choose a nonempty logo up to 2 MB.');
    const bytes = await readFile(filePath);
    if (!bytes.length || bytes.length > 2 * 1024 * 1024) throw new Error('Choose a nonempty logo up to 2 MB.');
    return textResult(await callAgentApi('reports_upload_logo', { reportId, mime, data: bytes.toString('base64') }));
  });
}
