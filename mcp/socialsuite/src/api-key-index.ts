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

const server = new McpServer({
  name: 'socialsuite-api-key-mcp',
  version: '0.2.0',
});

const gatewayTool = (action: string) => async (input: Record<string, unknown> = {}) =>
  textResult(await callAgentApi(action, input));

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

const transport = new StdioServerTransport();
await server.connect(transport);
