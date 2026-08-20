#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import { callAgentApi, textResult } from './gateway.js';

const campaignTypeSchema = z.enum(['socials', 'google-ad', 'meta-ad', 'blogs']);
const contentItemTypeSchema = z.enum(['social-post', 'google-ad', 'social-ad', 'blog']);
const workModeSchema = z.enum(['instant', 'deep']);
const modelPreferenceSchema = z.enum(['deepseek', 'anthropic']);
const researchProviderSchema = z.enum(['tavily', 'perplexity']);
const jsonObjectSchema = z.record(z.string(), z.unknown());
const teamRoleSchema = z.enum(['admin', 'editor', 'viewer']);
const apiKeyPermissionSchema = z.enum(['read', 'write']);
const brandItemTableSchema = z.enum(['brand_colors', 'brand_fonts', 'brand_logos', 'brand_logo_rules', 'brand_mood_images']);
const genericTableSchema = z.enum([
  'organizations',
  'org_members',
  'projects',
  'folders',
  'campaigns',
  'content_items',
  'tasks',
  'task_stages',
  'task_comments',
  'task_comment_reads',
  'calendar_events',
  'notes',
  'vault_credentials',
  'feed_folders',
  'feed_posts',
  'portal_clients',
  'portal_feeds',
  'portal_review_posts',
  'portal_comments',
  'portal_review_events',
  'brand_guides',
  'brand_colors',
  'brand_fonts',
  'brand_logos',
  'brand_logo_rules',
  'brand_mood_images',
  'brand_knowledge_documents',
  'ai_agents',
  'ai_agent_versions',
  'ai_agent_workflow_steps',
  'ai_runs',
  'ai_run_steps',
  'ai_run_events',
  'ai_artifacts',
  'ai_run_approvals',
  'ai_run_documents',
  'ai_credit_accounts',
  'org_tools',
  'tool_registry',
]);
const filterSchema = z.object({
  column: z.string().min(1),
  op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in']).default('eq'),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()])), z.null()]),
});

const server = new McpServer({
  name: 'socialsuite-api-key-mcp',
  version: '0.2.0',
});

const gatewayTool = (action: string) => async (input: Record<string, unknown> = {}) =>
  textResult(await callAgentApi(action, input));

function registerGatewayTool(
  name: string,
  title: string,
  description: string,
  inputSchema: Record<string, z.ZodTypeAny>,
  action = name.replace(/^socialsuite_/, ''),
  readOnly = false,
) {
  server.registerTool(
    name,
    {
      title,
      description,
      inputSchema,
      ...(readOnly ? { annotations: { readOnlyHint: true } } : {}),
    },
    gatewayTool(action),
  );
}

server.registerTool(
  'socialsuite_whoami',
  {
    title: 'SocialSuite current API key login',
    description: 'Show the SocialSuite user, active workspace, API key permission, and memberships.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  gatewayTool('whoami'),
);

server.registerTool(
  'socialsuite_workspace_overview',
  {
    title: 'SocialSuite workspace overview',
    description: 'Get projects, folders, campaigns, brand guides, notes, tasks, calendar events, and recent AI runs.',
    inputSchema: { limit: z.number().int().positive().max(100).default(25) },
    annotations: { readOnlyHint: true },
  },
  gatewayTool('workspace_overview'),
);

server.registerTool(
  'socialsuite_ensure_project',
  {
    title: 'Create or find SocialSuite project',
    description: 'Create a project if it does not already exist by exact name.',
    inputSchema: { name: z.string().min(1) },
  },
  gatewayTool('ensure_project'),
);

server.registerTool(
  'socialsuite_ensure_folder',
  {
    title: 'Create or find SocialSuite folder',
    description: 'Create a folder in a project if it does not already exist by exact name.',
    inputSchema: { projectId: z.string().min(1), name: z.string().min(1).default('General') },
  },
  gatewayTool('ensure_folder'),
);

server.registerTool(
  'socialsuite_ensure_campaign',
  {
    title: 'Create or find SocialSuite campaign',
    description: 'Create a campaign in a folder if it does not already exist by exact name.',
    inputSchema: {
      folderId: z.string().min(1),
      name: z.string().min(1),
      type: campaignTypeSchema.default('socials'),
      deadline: z.string().nullable().optional(),
    },
  },
  gatewayTool('ensure_campaign'),
);

server.registerTool(
  'socialsuite_get_project_context',
  {
    title: 'Get SocialSuite project context',
    description: 'Read a project with folders, campaigns, brand guides, tasks, notes, and recent AI runs.',
    inputSchema: { projectId: z.string().min(1), limit: z.number().int().positive().max(100).default(50) },
    annotations: { readOnlyHint: true },
  },
  gatewayTool('get_project_context'),
);

server.registerTool(
  'socialsuite_setup_brand_from_website',
  {
    title: 'Set up SocialSuite brand from website',
    description: 'Create/find project and brand guide, run website research, compile the knowledge base, and return the brand bundle.',
    inputSchema: {
      projectName: z.string().min(1),
      brandName: z.string().min(1),
      websiteUrl: z.string().min(1),
      projectId: z.string().nullable().optional(),
    },
  },
  gatewayTool('setup_brand_from_website'),
);

server.registerTool(
  'socialsuite_get_brand_bundle',
  {
    title: 'Get SocialSuite brand bundle',
    description: 'Read a brand guide plus colors, fonts, logos, logo rules, mood images, and compiled knowledge document.',
    inputSchema: { guideId: z.string().min(1) },
    annotations: { readOnlyHint: true },
  },
  gatewayTool('get_brand_bundle'),
);

server.registerTool(
  'socialsuite_create_content_item',
  {
    title: 'Create SocialSuite content item',
    description: 'Create a campaign content item with a type-specific JSON payload.',
    inputSchema: {
      campaignId: z.string().min(1),
      type: contentItemTypeSchema,
      name: z.string().optional(),
      status: z.string().default('draft'),
      payload: jsonObjectSchema.default({}),
    },
  },
  gatewayTool('create_content_item'),
);

server.registerTool(
  'socialsuite_create_task',
  {
    title: 'Create SocialSuite task',
    description: 'Create a SocialSuite task linked to org, project, folder, or campaign.',
    inputSchema: {
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.string().default('todo'),
      dueDate: z.string().nullable().optional(),
      projectId: z.string().nullable().optional(),
      folderId: z.string().nullable().optional(),
      campaignId: z.string().nullable().optional(),
      assigneeId: z.string().nullable().optional(),
    },
  },
  gatewayTool('create_task'),
);

server.registerTool(
  'socialsuite_create_calendar_event',
  {
    title: 'Create SocialSuite calendar event',
    description: 'Create a calendar event linked to a campaign.',
    inputSchema: {
      campaignId: z.string().min(1),
      title: z.string().min(1),
      eventDate: z.string().min(1),
      type: campaignTypeSchema,
    },
  },
  gatewayTool('create_calendar_event'),
);

server.registerTool(
  'socialsuite_create_note',
  {
    title: 'Create SocialSuite note',
    description: 'Create a project or workspace note.',
    inputSchema: {
      title: z.string().min(1),
      text: z.string().default(''),
      projectId: z.string().nullable().optional(),
      content: z.array(z.unknown()).optional(),
    },
  },
  gatewayTool('create_note'),
);

server.registerTool(
  'socialsuite_start_campaign_mission',
  {
    title: 'Start SocialSuite campaign mission',
    description: 'Start a Brief to Campaign mission with explicit mode, model provider, and research provider.',
    inputSchema: {
      brief: z.string().min(1),
      workMode: workModeSchema.default('instant'),
      modelPreference: modelPreferenceSchema.default('deepseek'),
      researchProvider: researchProviderSchema.default('tavily'),
      projectId: z.string().nullable().optional(),
      folderId: z.string().nullable().optional(),
      campaignId: z.string().nullable().optional(),
      brandGuideId: z.string().nullable().optional(),
      brandKnowledgeDocumentId: z.string().nullable().optional(),
      extraContext: jsonObjectSchema.default({}),
      waitForArtifact: z.boolean().default(false),
      waitTimeoutSeconds: z.number().int().positive().max(300).default(180),
    },
  },
  gatewayTool('start_campaign_mission'),
);

server.registerTool(
  'socialsuite_wait_for_ai_artifact',
  {
    title: 'Wait for SocialSuite AI artifact',
    description: 'Poll an AI run until it produces an artifact, needs approval, fails, is canceled, completes, or times out.',
    inputSchema: {
      runId: z.string().min(1),
      timeoutSeconds: z.number().int().positive().max(300).default(180),
      pollSeconds: z.number().int().positive().max(15).default(3),
    },
    annotations: { readOnlyHint: true },
  },
  gatewayTool('wait_for_ai_artifact'),
);

server.registerTool(
  'socialsuite_get_ai_run_details',
  {
    title: 'Get SocialSuite AI run details',
    description: 'Read an AI run, steps, events, and artifacts.',
    inputSchema: { runId: z.string().min(1) },
    annotations: { readOnlyHint: true },
  },
  gatewayTool('get_ai_run_details'),
);

server.registerTool(
  'socialsuite_commit_ai_artifact',
  {
    title: 'Commit SocialSuite AI artifact',
    description: 'Commit an approved AI artifact into campaigns, content items, and calendar rows.',
    inputSchema: {
      runId: z.string().min(1),
      artifactId: z.string().optional(),
      selection: jsonObjectSchema.optional(),
    },
  },
  gatewayTool('commit_ai_artifact'),
);

server.registerTool(
  'socialsuite_cancel_ai_mission',
  {
    title: 'Cancel SocialSuite AI mission',
    description: 'Cancel an active SocialSuite AI mission.',
    inputSchema: { runId: z.string().min(1) },
  },
  gatewayTool('cancel_ai_mission'),
);

registerGatewayTool(
  'socialsuite_update_project',
  'Update SocialSuite project',
  'Rename or update a project in the active workspace.',
  { projectId: z.string().min(1), updates: jsonObjectSchema },
  'update_project',
);

registerGatewayTool(
  'socialsuite_update_folder',
  'Update SocialSuite folder',
  'Rename or update a folder in the active workspace.',
  { folderId: z.string().min(1), updates: jsonObjectSchema },
  'update_folder',
);

registerGatewayTool(
  'socialsuite_update_campaign',
  'Update SocialSuite campaign',
  'Update campaign name, type, or deadline.',
  { campaignId: z.string().min(1), updates: jsonObjectSchema },
  'update_campaign',
);

registerGatewayTool(
  'socialsuite_update_content_item',
  'Update SocialSuite content item',
  'Update a campaign content draft payload, name, type, or status.',
  { contentItemId: z.string().min(1), updates: jsonObjectSchema },
  'update_content_item',
);

registerGatewayTool(
  'socialsuite_delete_content_item',
  'Delete SocialSuite content item',
  'Delete a campaign content draft.',
  { contentItemId: z.string().min(1) },
  'delete_content_item',
);

registerGatewayTool(
  'socialsuite_list_tasks',
  'List SocialSuite tasks',
  'List tasks with stages, comments, read markers, and team members.',
  { limit: z.number().int().positive().max(250).default(100) },
  'list_tasks',
  true,
);

registerGatewayTool(
  'socialsuite_update_task',
  'Update SocialSuite task',
  'Update task title, status, due date, links, assignee, or ordering.',
  { taskId: z.string().min(1), updates: jsonObjectSchema },
  'update_task',
);

registerGatewayTool(
  'socialsuite_delete_task',
  'Delete SocialSuite task',
  'Delete a task in the active workspace.',
  { taskId: z.string().min(1) },
  'delete_task',
);

registerGatewayTool(
  'socialsuite_move_task',
  'Move SocialSuite task',
  'Move a task to another task stage and optionally persist visible ordering.',
  { taskId: z.string().min(1), status: z.string().min(1), orderedIds: z.array(z.string()).default([]) },
  'move_task',
);

registerGatewayTool(
  'socialsuite_save_task_stages',
  'Save SocialSuite task stages',
  'Replace or reorder the custom task stages for the active workspace.',
  {
    stages: z.array(z.object({
      id: z.string().min(1),
      title: z.string().min(1),
      color: z.string().default('bg-slate-500'),
      sortOrder: z.number().int().optional(),
      sort_order: z.number().int().optional(),
    })).min(1),
  },
  'save_task_stages',
);

registerGatewayTool(
  'socialsuite_add_task_comment',
  'Add SocialSuite task comment',
  'Add a comment or reply to a task.',
  { taskId: z.string().min(1), body: z.string().min(1), parentId: z.string().nullable().optional() },
  'add_task_comment',
);

registerGatewayTool(
  'socialsuite_delete_task_comment',
  'Delete SocialSuite task comment',
  'Delete one of the API key owner’s task comments.',
  { commentId: z.string().min(1) },
  'delete_task_comment',
);

registerGatewayTool(
  'socialsuite_mark_task_comments_read',
  'Mark SocialSuite task comments read',
  'Mark comments on a task as read for the API key owner.',
  { taskId: z.string().min(1) },
  'mark_task_comments_read',
);

registerGatewayTool(
  'socialsuite_list_calendar_events',
  'List SocialSuite calendar events',
  'List calendar events, optionally constrained by date range.',
  {
    from: z.string().optional(),
    to: z.string().optional(),
    limit: z.number().int().positive().max(250).default(100),
  },
  'list_calendar_events',
  true,
);

registerGatewayTool(
  'socialsuite_update_calendar_event',
  'Update SocialSuite calendar event',
  'Update a calendar event linked to a campaign.',
  { eventId: z.string().min(1), updates: jsonObjectSchema },
  'update_calendar_event',
);

registerGatewayTool(
  'socialsuite_delete_calendar_event',
  'Delete SocialSuite calendar event',
  'Delete a calendar event.',
  { eventId: z.string().min(1) },
  'delete_calendar_event',
);

registerGatewayTool(
  'socialsuite_list_notes',
  'List SocialSuite notes',
  'List workspace or project notes.',
  { projectId: z.string().nullable().optional(), limit: z.number().int().positive().max(250).default(100) },
  'list_notes',
  true,
);

registerGatewayTool(
  'socialsuite_update_note',
  'Update SocialSuite note',
  'Update a note title, content, or project link.',
  { noteId: z.string().min(1), updates: jsonObjectSchema },
  'update_note',
);

registerGatewayTool(
  'socialsuite_delete_note',
  'Delete SocialSuite note',
  'Delete a workspace or project note.',
  { noteId: z.string().min(1) },
  'delete_note',
);

registerGatewayTool(
  'socialsuite_list_vault_credentials',
  'List SocialSuite vault credentials',
  'List password vault entries. Encrypted passwords are omitted unless explicitly requested.',
  { includeEncryptedPassword: z.boolean().default(false), limit: z.number().int().positive().max(250).default(100) },
  'list_vault_credentials',
  true,
);

registerGatewayTool(
  'socialsuite_create_vault_credential',
  'Create SocialSuite vault credential',
  'Create a password vault entry using password when server encryption is configured, or encryptedPassword when already encrypted.',
  {
    serviceName: z.string().min(1),
    username: z.string().min(1),
    password: z.string().optional(),
    encryptedPassword: z.string().optional(),
    url: z.string().nullable().optional(),
    category: z.string().nullable().optional(),
    colorClass: z.string().nullable().optional(),
    projectId: z.string().nullable().optional(),
  },
  'create_vault_credential',
);

registerGatewayTool(
  'socialsuite_update_vault_credential',
  'Update SocialSuite vault credential',
  'Update a password vault entry.',
  { credentialId: z.string().min(1), updates: jsonObjectSchema },
  'update_vault_credential',
);

registerGatewayTool(
  'socialsuite_delete_vault_credential',
  'Delete SocialSuite vault credential',
  'Delete a password vault entry.',
  { credentialId: z.string().min(1) },
  'delete_vault_credential',
);

registerGatewayTool(
  'socialsuite_list_feed_monitor',
  'List SocialSuite feed monitor',
  'List Feed Monitor folders and saved posts.',
  { limit: z.number().int().positive().max(250).default(100) },
  'list_feed_monitor',
  true,
);

registerGatewayTool(
  'socialsuite_create_feed_folder',
  'Create SocialSuite feed folder',
  'Create a Feed Monitor folder.',
  { name: z.string().min(1), description: z.string().nullable().optional(), color: z.string().nullable().optional() },
  'create_feed_folder',
);

registerGatewayTool(
  'socialsuite_update_feed_folder',
  'Update SocialSuite feed folder',
  'Rename or update a Feed Monitor folder.',
  { folderId: z.string().min(1), updates: jsonObjectSchema },
  'update_feed_folder',
);

registerGatewayTool(
  'socialsuite_delete_feed_folder',
  'Delete SocialSuite feed folder',
  'Delete a Feed Monitor folder.',
  { folderId: z.string().min(1) },
  'delete_feed_folder',
);

registerGatewayTool(
  'socialsuite_create_feed_post',
  'Create SocialSuite feed post',
  'Save a social URL into Feed Monitor with optional Open Graph metadata.',
  {
    platform: z.string().min(1),
    url: z.string().min(1),
    folderId: z.string().nullable().optional(),
    content: z.string().nullable().optional(),
    ogTitle: z.string().nullable().optional(),
    ogDescription: z.string().nullable().optional(),
    ogImage: z.string().nullable().optional(),
    ogSiteName: z.string().nullable().optional(),
  },
  'create_feed_post',
);

registerGatewayTool(
  'socialsuite_update_feed_post',
  'Update SocialSuite feed post',
  'Update a saved Feed Monitor post or assign it to a folder.',
  { postId: z.string().min(1), updates: jsonObjectSchema },
  'update_feed_post',
);

registerGatewayTool(
  'socialsuite_delete_feed_post',
  'Delete SocialSuite feed post',
  'Delete a saved Feed Monitor post.',
  { postId: z.string().min(1) },
  'delete_feed_post',
);

registerGatewayTool(
  'socialsuite_list_client_portal',
  'List SocialSuite client portal',
  'List portal clients, feeds, review posts, comments, and activity.',
  { limit: z.number().int().positive().max(250).default(100) },
  'list_client_portal',
  true,
);

registerGatewayTool(
  'socialsuite_create_portal_client',
  'Create SocialSuite portal client',
  'Create a client portal client record.',
  { name: z.string().min(1), company: z.string().nullable().optional(), logo: z.string().nullable().optional() },
  'create_portal_client',
);

registerGatewayTool(
  'socialsuite_update_portal_client',
  'Update SocialSuite portal client',
  'Update a client portal client record.',
  { clientId: z.string().min(1), updates: jsonObjectSchema },
  'update_portal_client',
);

registerGatewayTool(
  'socialsuite_delete_portal_client',
  'Delete SocialSuite portal client',
  'Delete a client portal client and its child feeds/review posts.',
  { clientId: z.string().min(1) },
  'delete_portal_client',
);

registerGatewayTool(
  'socialsuite_create_portal_feed',
  'Create SocialSuite portal feed',
  'Create a portal review feed under a client.',
  { clientId: z.string().min(1), name: z.string().min(1) },
  'create_portal_feed',
);

registerGatewayTool(
  'socialsuite_delete_portal_feed',
  'Delete SocialSuite portal feed',
  'Delete a portal feed and its review posts/comments.',
  { feedId: z.string().min(1) },
  'delete_portal_feed',
);

registerGatewayTool(
  'socialsuite_create_portal_review_post',
  'Create SocialSuite portal review post',
  'Add one item to a client portal review feed.',
  {
    feedId: z.string().min(1),
    contentType: z.string().min(1),
    snapshot: jsonObjectSchema.default({}),
    contentItemId: z.string().nullable().optional(),
    status: z.string().default('pending'),
  },
  'create_portal_review_post',
);

registerGatewayTool(
  'socialsuite_update_portal_review_status',
  'Update SocialSuite portal review status',
  'Approve, reject, or otherwise change a portal review post status using the app review activity RPC.',
  { postId: z.string().min(1), status: z.string().min(1), reviewerName: z.string().nullable().optional() },
  'update_portal_review_status',
);

registerGatewayTool(
  'socialsuite_add_portal_comment',
  'Add SocialSuite portal comment',
  'Add an internal or client-style comment to a portal review post.',
  { postId: z.string().min(1), text: z.string().min(1), author: z.string().nullable().optional(), isClient: z.boolean().default(false) },
  'add_portal_comment',
);

registerGatewayTool(
  'socialsuite_delete_portal_review_post',
  'Delete SocialSuite portal review post',
  'Delete a portal review post and its comments.',
  { postId: z.string().min(1) },
  'delete_portal_review_post',
);

registerGatewayTool(
  'socialsuite_update_brand_guide',
  'Update SocialSuite brand guide',
  'Update brand guide fields such as voice, visual direction, terms, and custom sections.',
  { guideId: z.string().min(1), updates: jsonObjectSchema },
  'update_brand_guide',
);

registerGatewayTool(
  'socialsuite_delete_brand_guide',
  'Delete SocialSuite brand guide',
  'Delete a brand guide and its child brand assets.',
  { guideId: z.string().min(1) },
  'delete_brand_guide',
);

registerGatewayTool(
  'socialsuite_upsert_brand_item',
  'Upsert SocialSuite brand item',
  'Create or update a brand guide color, font, logo, logo rule, or mood image.',
  { table: brandItemTableSchema, guideId: z.string().min(1), id: z.string().optional(), values: jsonObjectSchema },
  'upsert_brand_item',
);

registerGatewayTool(
  'socialsuite_delete_brand_item',
  'Delete SocialSuite brand item',
  'Delete one brand guide child item.',
  { table: brandItemTableSchema, id: z.string().min(1) },
  'delete_brand_item',
);

registerGatewayTool(
  'socialsuite_update_brand_knowledge_markdown',
  'Update SocialSuite brand knowledge markdown',
  'Manually edit the compiled brand knowledge document markdown.',
  { documentId: z.string().min(1), markdown: z.string().min(1) },
  'update_brand_knowledge_markdown',
);

registerGatewayTool(
  'socialsuite_analyze_brand_visual_direction',
  'Analyze SocialSuite brand visual direction',
  'Run visual direction analysis for a brand guide and charge the related AI action credit.',
  { guideId: z.string().min(1) },
  'analyze_brand_visual_direction',
);

registerGatewayTool(
  'socialsuite_list_ai_credits',
  'List SocialSuite AI credits',
  'Read the active workspace AI credit account.',
  {},
  'list_ai_credits',
  true,
);

registerGatewayTool(
  'socialsuite_delete_ai_run',
  'Delete SocialSuite AI run',
  'Delete an AI history run from the active workspace.',
  { runId: z.string().min(1) },
  'delete_ai_run',
);

registerGatewayTool(
  'socialsuite_list_ai_agents',
  'List SocialSuite AI agents',
  'List built-in/custom AI agents and the active workflow order.',
  {},
  'list_ai_agents',
  true,
);

registerGatewayTool(
  'socialsuite_save_ai_agent_skill',
  'Save SocialSuite AI agent skill',
  'Update a custom workspace AI agent skill markdown and record a version.',
  { agentId: z.string().min(1), skillMd: z.string().min(1), changeNote: z.string().nullable().optional() },
  'save_ai_agent_skill',
);

registerGatewayTool(
  'socialsuite_create_ai_agent',
  'Create SocialSuite AI agent',
  'Create a custom workspace AI agent.',
  { name: z.string().min(1), description: z.string().default(''), skillMd: z.string().min(1), tools: z.array(z.unknown()).default([]), permissions: jsonObjectSchema.default({}) },
  'create_ai_agent',
);

registerGatewayTool(
  'socialsuite_delete_ai_agent',
  'Delete SocialSuite AI agent',
  'Delete a custom workspace AI agent.',
  { agentId: z.string().min(1) },
  'delete_ai_agent',
);

registerGatewayTool(
  'socialsuite_save_ai_workflow',
  'Save SocialSuite AI workflow',
  'Replace the active workspace AI agent workflow order.',
  { agentSlugs: z.array(z.string().min(1)).min(1) },
  'save_ai_workflow',
);

registerGatewayTool(
  'socialsuite_list_team',
  'List SocialSuite team',
  'List team members and pending invitations for the active workspace.',
  {},
  'list_team',
  true,
);

registerGatewayTool(
  'socialsuite_invite_team_member',
  'Invite SocialSuite team member',
  'Create a team invitation link or send an invite email.',
  { email: z.string().email(), role: teamRoleSchema.default('viewer'), sendEmail: z.boolean().default(false), siteUrl: z.string().nullable().optional() },
  'invite_team_member',
);

registerGatewayTool(
  'socialsuite_revoke_team_invite',
  'Revoke SocialSuite team invitation',
  'Revoke a pending team invitation.',
  { invitationId: z.string().min(1) },
  'revoke_team_invite',
);

registerGatewayTool(
  'socialsuite_get_account_profile',
  'Get SocialSuite account profile',
  'Read the API key owner account profile.',
  {},
  'get_account_profile',
  true,
);

registerGatewayTool(
  'socialsuite_update_account_profile',
  'Update SocialSuite account profile',
  'Update the API key owner display name or avatar URL.',
  { fullName: z.string().nullable().optional(), avatarUrl: z.string().nullable().optional() },
  'update_account_profile',
);

registerGatewayTool(
  'socialsuite_list_account_api_keys',
  'List SocialSuite account API keys',
  'List Agent API keys for the API key owner.',
  {},
  'list_account_api_keys',
  true,
);

registerGatewayTool(
  'socialsuite_create_account_api_key',
  'Create SocialSuite account API key',
  'Create a new Agent API key for the API key owner. The secret is returned once.',
  { name: z.string().min(1), permission: apiKeyPermissionSchema.default('read') },
  'create_account_api_key',
);

registerGatewayTool(
  'socialsuite_revoke_account_api_key',
  'Revoke SocialSuite account API key',
  'Revoke one Agent API key owned by the API key owner.',
  { keyId: z.string().min(1) },
  'revoke_account_api_key',
);

registerGatewayTool(
  'socialsuite_list_micro_tools',
  'List SocialSuite micro tools',
  'List enabled SocialSuite micro tools from org tool settings.',
  {},
  'list_micro_tools',
  true,
);

registerGatewayTool(
  'socialsuite_list_table_rows',
  'List SocialSuite table rows',
  'List rows from a scoped SocialSuite table. Use only when a workflow-specific tool does not fit.',
  {
    table: genericTableSchema,
    select: z.string().default('*'),
    filters: z.array(filterSchema).default([]),
    orderBy: z.string().optional(),
    ascending: z.boolean().default(false),
    limit: z.number().int().positive().max(250).default(25),
  },
  'list_table_rows',
  true,
);

registerGatewayTool(
  'socialsuite_get_table_row',
  'Get SocialSuite table row',
  'Fetch one row by id from a scoped SocialSuite table.',
  { table: genericTableSchema, id: z.string().min(1), select: z.string().default('*') },
  'get_table_row',
  true,
);

registerGatewayTool(
  'socialsuite_create_table_row',
  'Create SocialSuite table row',
  'Create one row in a scoped SocialSuite table. Prefer workflow-specific tools.',
  { table: genericTableSchema, values: jsonObjectSchema, select: z.string().default('*') },
  'create_table_row',
);

registerGatewayTool(
  'socialsuite_update_table_row',
  'Update SocialSuite table row',
  'Update one row by id in a scoped SocialSuite table. Prefer workflow-specific tools.',
  { table: genericTableSchema, id: z.string().min(1), values: jsonObjectSchema, select: z.string().default('*') },
  'update_table_row',
);

registerGatewayTool(
  'socialsuite_delete_table_rows',
  'Delete SocialSuite table rows',
  'Delete scoped rows matching filters. Filters are required.',
  { table: genericTableSchema, filters: z.array(filterSchema).min(1), limit: z.number().int().positive().max(250).default(100) },
  'delete_table_rows',
);

registerGatewayTool(
  'socialsuite_list_rows',
  'List SocialSuite rows',
  'Compatibility alias for scoped table row listing.',
  {
    table: genericTableSchema,
    select: z.string().default('*'),
    filters: z.array(filterSchema).default([]),
    orderBy: z.string().optional(),
    ascending: z.boolean().default(false),
    limit: z.number().int().positive().max(250).default(25),
  },
  'list_table_rows',
  true,
);

registerGatewayTool(
  'socialsuite_get_row',
  'Get SocialSuite row',
  'Compatibility alias for scoped table row lookup.',
  { table: genericTableSchema, id: z.string().min(1), select: z.string().default('*') },
  'get_table_row',
  true,
);

registerGatewayTool(
  'socialsuite_create_row',
  'Create SocialSuite row',
  'Compatibility alias for scoped table row creation.',
  { table: genericTableSchema, values: jsonObjectSchema, select: z.string().default('*') },
  'create_table_row',
);

registerGatewayTool(
  'socialsuite_update_row',
  'Update SocialSuite row',
  'Compatibility alias for scoped table row updates.',
  { table: genericTableSchema, id: z.string().min(1), values: jsonObjectSchema, select: z.string().default('*') },
  'update_table_row',
);

registerGatewayTool(
  'socialsuite_delete_rows',
  'Delete SocialSuite rows',
  'Compatibility alias for scoped table row deletion.',
  { table: genericTableSchema, filters: z.array(filterSchema).min(1), limit: z.number().int().positive().max(250).default(100) },
  'delete_table_rows',
);

const transport = new StdioServerTransport();
await server.connect(transport);
