import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod/v4';
import { callAgentApi, textResult } from './gateway.js';

const id = z.string().uuid();
const conversation = { conversationId: id };
const context = { projectId: id.nullable().optional(), brandId: id.nullable().optional() };
const source = z.enum(['ga4', 'gsc', 'gbp', 'seo']);
const period = { clientId: id, start: z.iso.date(), end: z.iso.date(), compare: z.boolean().optional() };

export function registerWorkflows(server: McpServer) {
  const tool = (action: string, description: string, schema: Record<string, z.ZodType> = {}, readOnly = false) =>
    server.registerTool(`socialsuite_${action}`, {
      description, inputSchema: schema, annotations: { readOnlyHint: readOnly },
    }, async input => textResult(await callAgentApi(action, input)));

  tool('get_agent_catalog', 'Discover current Super AI model IDs by work mode, Studio models and available workflow actions. Use returned models instead of guessing IDs.', {}, true);
  tool('super_ai_bootstrap', 'List accessible Super AI chats, projects, brands, credits and personal chat state.', {}, true);
  tool('super_ai_health', 'Admin only: check Super AI provider/model and recovery availability without generating content.', {}, true);
  tool('super_ai_create', 'Create a brand/project-aware Super AI chat. Does not generate content.', context);
  tool('super_ai_thread', 'Read chat history, requests, artifacts and membership. Use after request completion to retrieve drafts and sources.', conversation, true);
  tool('super_ai_request', 'Poll a Super AI request, including status, stage, partial text, errors and credit settlement. Poll with a delay until succeeded, failed or canceled; never resend with a new ID after an uncertain result.', { requestId: id }, true);
  tool('super_ai_configure', 'Rename or change project/brand context of an accessible chat; context changes may be blocked while a request runs.', { ...conversation, ...context, title: z.string().trim().min(1).max(180).optional() });
  tool('super_ai_state', 'Set both personal pinned and archived state for a chat. Preserve the current value of the other flag.', { ...conversation, pinned: z.boolean(), archived: z.boolean() });
  tool('super_ai_quote', 'Estimate credits before generation. Select a model from get_agent_catalog; deep uses Deep Work. Quote does not generate an answer. Refresh expired quotes or changed context before send.', {
    ...conversation, ...context, prompt: z.string().trim().min(1).max(30000), model: z.string().min(1),
    specialist: z.enum(['auto', 'research', 'strategy', 'writing', 'google-ads', 'social', 'website']).optional(),
    deep: z.boolean().optional(), research: z.boolean().optional(), researchProvider: z.enum(['tavily', 'sonar']).optional(),
    pageUrl: z.url().optional(), artifactId: id.optional(),
  });
  tool('super_ai_send', 'Accept a Super AI quote and start generation; reserves/spends credits. Use a fresh requestId for a new request; reuse the same requestId and quoteId after an uncertain response. Poll super_ai_request.', { requestId: id, quoteId: id });
  tool('super_ai_cancel', 'Cancel the active request in a chat; provider work already performed may still cost credits.', conversation);
  tool('super_ai_delete', 'Owner only: delete a chat and cancel its work.', conversation);
  tool('super_ai_share', 'Owner only: share a chat with a workspace user, change view/contribute access, or remove access.', { ...conversation, userId: id, role: z.enum(['view', 'contribute', 'remove']) });
  tool('super_ai_destinations', 'List workspace project/folder/campaign destinations and existing content placeholders for saving a Super AI draft.', conversation, true);
  tool('super_ai_artifact_saves', 'Read active saves for an artifact and its ancestors, including content updated_at needed to replace a placeholder safely.', { ...conversation, artifactId: id }, true);
  tool('super_ai_revise', 'Create a validated revision of a Super AI artifact without model generation. Reuse revisionId only for identical edits.', { ...conversation, artifactId: id, revisionId: id, name: z.string().min(1), fields: z.record(z.string(), z.unknown()) });
  tool('super_ai_commit', 'Save an approved Super AI artifact as a campaign draft; does not publish. Reuse saveId after uncertain responses. Existing items require expectedUpdatedAt from current content.', {
    ...conversation, artifactId: id, saveId: id,
    destination: z.object({
      projectId: id.optional(), projectName: z.string().trim().min(1).max(150).optional(),
      folderId: id.optional(), folderName: z.string().trim().min(1).max(150).optional(),
      campaignId: id.optional(), campaignName: z.string().trim().min(1).max(150).optional(),
      itemId: id.optional(), expectedUpdatedAt: z.string().min(1).optional(),
    }),
  });
  tool('super_ai_undo', 'Undo a Super AI save using its original saveId; fails safely if the saved content changed.', { saveId: id });
  tool('super_ai_branch', 'Branch chat history before a selected message into a new chat. Does not start generation.', { ...conversation, messageId: id });

  tool('analytics_bootstrap', 'List workspace analytics clients, connections, active mappings, projects and portal clients.', {}, true);
  tool('analytics_dashboard', 'Read client reports for explicit inclusive YYYY-MM-DD dates, optionally compared with the previous period. Missing reports are queued by the app; inspect report readiness/errors before interpreting metrics.', period, true);
  tool('analytics_save_client', 'Create or update an Analytics client. Updates replace name, website, project and portal-client links; preserve links the user did not ask to change.', { clientId: id.optional(), name: z.string().trim().min(1).max(120), website: z.string().optional(), projectId: id.nullable().optional(), portalClientId: id.nullable().optional() });
  tool('analytics_client_preferences', 'Set Analytics client favorite/archive flags.', { clientId: id, favorite: z.boolean().optional(), archived: z.boolean().optional() });
  tool('analytics_connect_source', 'Start/resume a client source connection. Return authorization URL to the user for account consent; treat it as a secret. Managed sources may return no URL. Avoid restarting after an account was shared.', { clientId: id, source, restart: z.boolean().optional() });
  tool('analytics_resources', 'Discover provider accounts/properties and SEO engines after user authorization. Requires a write key like the app provider-discovery workflow.', { clientId: id, connectionId: id, source, resourceId: z.string().optional() });
  tool('analytics_map', 'Map an authorized provider resource to a client and enqueue initial reports. SEO requires engineId from resources.', { clientId: id, connectionId: id, source, resourceId: z.string().min(1), engineId: z.string().optional() });
  tool('analytics_unmap', 'Deactivate an Analytics source mapping.', { mappingId: id });
  tool('analytics_disconnect', 'Disconnect a provider connection and deactivate its mappings.', { connectionId: id });
  tool('analytics_refresh', 'Force-refresh client reports for explicit dates. Provider jobs run asynchronously; poll dashboard with a delay to inspect readiness.', period);
}
