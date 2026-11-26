// Run against an app checkout before releasing either side of the integration.
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { attachmentsSchema } from '../dist/attachments.js';
import { reportDocumentSchema, reportDatasetSchema } from '../dist/reports.js';
import { connectedReportFixture } from '../tests/connected-report-fixture.mjs';

const app = process.argv[2];
if (!app) throw new Error('Usage: npm run check:contract -- /absolute/path/to/social-suite');
const shared = resolve(app, 'supabase/functions/_shared/agent_extensions.ts');
const { superAiActions, analyticsActions, reportActions, extensionWriteActions, workflowReadActions } = await import(pathToFileURL(shared).href);
const transport = new StdioClientTransport({ command: process.execPath, args: ['dist/api-key-index.js'], env: { ...process.env, SOCIALSUITE_API_KEY: 'ss_read_contract_test' } });
const client = new Client({ name: 'contract-check', version: '1.0.0' });
try {
  await client.connect(transport);
  const { tools } = await client.listTools();
  const reportsModel = await import(pathToFileURL(resolve(app, 'supabase/functions/_shared/diy-reports.ts')).href);
  const reportsSkill = await readFile('../../skills/hermes/socialsuite/references/reports.md', 'utf8');
  const draft = JSON.parse(reportsSkill.match(/```json\r?\n([\s\S]*?)\r?\n```/)[1]);
  reportDocumentSchema.parse(draft.document);
  draft.datasets.forEach(d => reportDatasetSchema.parse(d));
  const resolved = reportsModel.present(draft.document, draft.datasets, [], null);
  assert.equal(resolved.blocks.find(b => b.type === 'kpi').value, 15, 'Reports skill formula/value keys do not match the app');
  const connected = connectedReportFixture();
  const connectedDocument = reportDocumentSchema.parse(connected.draft.document);
  const connectedDatasets = connected.draft.datasets.map(d => reportDatasetSchema.parse(d));
  const connectedView = reportsModel.present(connectedDocument, connectedDatasets, connected.cache);
  const valueFor = metric => connectedView.blocks.find(b => b.title === metric).value;
  assert.equal(valueFor('averageRank'), 9.5);
  assert.equal(valueFor('top10Share'), 0.55, 'Percentages must retain provider fractions');
  assert.equal(valueFor('providerSpecificMetric_2026'), 42, 'Provider-specific keys must not require a connector allowlist');
  assert.equal(valueFor('missingProviderMetric'), null, 'Missing metrics must not become zero');
  assert.equal(connectedView.blocks.find(b => b.title === 'contentScore').previous, undefined);
  assert.match(connectedView.blocks.find(b => b.title === 'domainTrust').description, /2026-11-24/);
  const keywordTable = connectedView.blocks.find(b => b.type === 'table').table;
  assert.equal(keywordTable.rows.length, 2);
  assert.equal(keywordTable.rows[0].label, 'Keyword label', 'Keyword row-label keys must survive MCP validation');
  const currentColumn = connectedDatasets[1].columns.find(c => c.metric === 'currentPosition').id;
  const previousColumn = connectedDatasets[1].columns.find(c => c.metric === 'previousPosition').id;
  assert.equal(keywordTable.rows[0].cells[currentColumn], 5);
  assert.equal(keywordTable.rows[1].cells[currentColumn], 'Unranked');
  assert.equal(keywordTable.rows[1].cells[previousColumn], 'No earlier check');
  assert.equal(tools.find(t => t.name === 'socialsuite_reports_save').annotations.destructiveHint, false);
  console.log('Connected Reports contract verified: keyword rows, snapshots, arbitrary catalog metrics, missing data and no implicit publication.');
  const directKpi = structuredClone(draft.document);
  const kpi = directKpi.blocks.find(b => b.type === 'kpi');
  kpi.calculation = { expression: `[${kpi.columnId}] / 3`, format: 'number' };
  delete kpi.columnId;
  const parsedKpi = reportDocumentSchema.parse(directKpi);
  const directResult = reportsModel.present(parsedKpi, draft.datasets, [], null);
  assert.equal(directResult.blocks.find(b => b.type === 'kpi').value, 5, 'The connector must preserve direct KPI formulas');
  const namedDataset = reportDatasetSchema.parse({
    ...draft.datasets[0],
    recordHeading: 'Period',
    rowLabels: { total: 'Lead summary' },
  });
  const namedTable = reportsModel.present(draft.document, [namedDataset], [], null).blocks.find(b => b.type === 'table').table;
  assert.equal(namedTable.recordHeading, 'Period');
  assert.equal(namedTable.rows[0].label, 'Lead summary', 'The connector must preserve generated row names');
  for (const layout of ['horizontal', 'transposed']) {
    const dataset = reportDatasetSchema.parse({ ...namedDataset, layout });
    assert.equal(dataset.layout, layout, 'The connector must retain the saved table layout');
    const table = reportsModel.present(draft.document, [dataset], [], null).blocks.find(b => b.type === 'table').table;
    assert.equal(table.layout, layout, 'The app presentation must retain the MCP table layout');
    assert.equal(table.recordHeading, 'Period');
    assert.deepEqual(table.rows, namedTable.rows, 'Orientation changes must retain record labels and data');
    assert.deepEqual(table.columns, namedTable.columns, 'Orientation changes must retain metric IDs and formats');
  }
  const { sources, connectableSources = sources } = await import(pathToFileURL(resolve(app, 'supabase/functions/_shared/analytics-model.ts')).href);
  for (const action of ['analytics_resources', 'analytics_map', 'analytics_connect_source']) {
    const schema = tools.find(t => t.name === `socialsuite_${action}`).inputSchema;
    assert.deepEqual([...schema.properties.source.enum].sort(),
      [...(action === 'analytics_connect_source' ? connectableSources : sources)].sort(),
      `${action}: Analytics source choices drifted from the app`);
  }
  const connect = tools.find(t => t.name === 'socialsuite_analytics_connect_source').inputSchema;
  assert.equal(connect.properties.apiKey?.type, 'string', 'SE Ranking setup must accept the client API key');
  const credits = tools.find(t => t.name === 'socialsuite_analytics_seo_credits');
  assert.ok(credits, 'SE Ranking subscription credits need an MCP tool');
  assert.deepEqual([...credits.inputSchema.required].sort(), ['clientId', 'connectionId']);
  const assistant = tools.find(t => t.name === 'socialsuite_analytics_ai_ask');
  const deadlines = tools.find(t => t.name === 'socialsuite_list_task_deadlines');
  assert.equal(assistant.annotations.readOnlyHint, false);
  assert.ok(assistant.inputSchema.required.includes('authorizeCredits'));
  assert.equal(deadlines.annotations.readOnlyHint, true);
  assert.deepEqual([...deadlines.inputSchema.required].sort(), ['from', 'to']);
  assert.equal(tools.find(t => t.name === 'socialsuite_reports_share').annotations.openWorldHint, true);
  const attachmentFile = resolve(app, 'supabase/functions/_shared/super_ai_attachments.ts');
  let attachmentValidator;
  try { await readFile(attachmentFile); attachmentValidator = await import(pathToFileURL(attachmentFile).href); }
  catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (attachmentValidator) {
    const { validateAttachments } = attachmentValidator;
    const image = 'data:image/png;base64,aGVsbG8=';
    const attachment = { name: 'brief.txt', size: 1, text: 'Brief', images: [] };
    for (const value of [
      undefined, [], [attachment], [{ ...attachment, text: '', images: [image] }],
      [{ ...attachment, size: 10 * 1024 * 1024 }],
      [{ ...attachment, name: ' ' }], [{ ...attachment, size: 0 }],
      [{ ...attachment, size: 1.5 }], [{ ...attachment, text: '', images: [] }],
      [{ ...attachment, text: 'x'.repeat(60001) }],
      Array(6).fill(attachment), Array(2).fill({ ...attachment, size: 6 * 1024 * 1024 }),
      Array(2).fill({ ...attachment, text: 'x'.repeat(50001) }),
      [{ ...attachment, images: Array(21).fill(image) }],
      [{ ...attachment, images: ['https://example.com/image.png'] }],
      [{ ...attachment, images: ['data:image/gif;base64,aGVsbG8='] }],
      [{ ...attachment, images: ['data:image/png;base64,' + 'A'.repeat(4 * 1024 * 1024)] }],
      [{ ...attachment, images: Array(6).fill('data:image/png;base64,' + 'A'.repeat(3 * 1024 * 1024)) }],
    ]) {
      let expected;
      try { expected = { success: true, data: validateAttachments(value) }; }
      catch { expected = { success: false }; }
      const actual = attachmentsSchema.optional().safeParse(value);
      assert.equal(actual.success, expected.success, 'Super AI attachment validation drifted from the app');
      if (actual.success && value !== undefined) assert.deepEqual(actual.data, expected.data);
    }
    console.log('Prepared attachment payloads and limits match the app backend.');
  } else console.log('App checkout has no attachment backend yet; attachment rollout is required separately.');
  for (const [file, routes, excluded] of [
    ['super-ai', superAiActions, ['worker', 'stream']],
    ['analytics-api', analyticsActions, []],
    ['reports-api', reportActions, ['public']],
  ]) {
    const source = await readFile(resolve(app, `supabase/functions/${file}/index.ts`), 'utf8');
    const actions = [...new Set([...source.matchAll(/body\.action === ["']([^"']+)["']/g)].map(m => m[1]))].filter(a => !excluded.includes(a)).sort();
    assert.deepEqual(Object.values(routes).sort(), actions, `${file}: backend public actions drifted from the agent allowlist`);
    for (const action of Object.keys(routes)) {
      const tool = tools.find(t => t.name === `socialsuite_${action}`);
      assert.ok(tool, `${action}: missing MCP tool`);
      assert.equal(tool.annotations?.readOnlyHint, workflowReadActions.has(action), `${action}: permission annotation drift`);
      assert.equal(extensionWriteActions.includes(action), !workflowReadActions.has(action), `${action}: write gate drift`);
    }
  }
  console.log(`Contract verified: ${tools.length} MCP tools; all Super AI, Analytics and Reports actions match the app.`);
} finally { await client.close(); }
