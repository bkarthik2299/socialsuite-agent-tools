#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod/v4';
import {
  allowedTables,
  assertAllowedTable,
  compactRow,
  getClient,
  invokeFunction,
  textResult,
  type JsonObject,
} from './socialsuite.js';
import { config } from './config.js';

const filterSchema = z.object({
  column: z.string().min(1),
  op: z.enum(['eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'like', 'ilike', 'in']).default('eq'),
  value: z.union([z.string(), z.number(), z.boolean(), z.array(z.union([z.string(), z.number(), z.boolean()])), z.null()]),
});

const jsonObjectSchema = z.record(z.string(), z.unknown());
const campaignTypeSchema = z.enum(['socials', 'google-ad', 'meta-ad', 'blogs']);
const contentItemTypeSchema = z.enum(['social-post', 'google-ad', 'social-ad', 'blog']);
const workModeSchema = z.enum(['instant', 'deep']);
const modelPreferenceSchema = z.enum(['deepseek', 'anthropic']);
const researchProviderSchema = z.enum(['tavily', 'perplexity']);

const server = new McpServer({
  name: 'socialsuite-hermes-mcp',
  version: '0.1.0',
});

function applyFilters(query: any, filters: z.infer<typeof filterSchema>[]) {
  for (const filter of filters) {
    if (filter.op === 'in') {
      if (!Array.isArray(filter.value)) throw new Error(`Filter "${filter.column}" uses "in" but value is not an array.`);
      query = query.in(filter.column, filter.value);
      continue;
    }
    query = query[filter.op](filter.column, filter.value);
  }
  return query;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeWebsiteUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) throw new Error('websiteUrl is required.');
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function modelIdFor(mode: z.infer<typeof workModeSchema>, provider: z.infer<typeof modelPreferenceSchema>) {
  if (mode === 'deep') {
    return provider === 'deepseek' ? 'deepseek/deepseek-v4-pro' : 'anthropic/claude-sonnet-5';
  }
  return provider === 'deepseek' ? 'deepseek/deepseek-v4-flash' : 'anthropic/claude-haiku-4.5';
}

async function ensureProject(name: string) {
  const { client, orgId } = await getClient();
  if (!orgId) throw new Error('No active SocialSuite organization was found for this login.');
  const cleanName = name.trim();
  if (!cleanName) throw new Error('Project name is required.');

  const { data: existing, error: lookupError } = await client
    .from('projects')
    .select('*')
    .eq('org_id', orgId)
    .eq('name', cleanName)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return { project: existing, created: false };

  const { data, error } = await client
    .from('projects')
    .insert({ org_id: orgId, name: cleanName })
    .select('*')
    .single();
  if (error) throw error;
  return { project: data, created: true };
}

async function ensureFolder(projectId: string, name: string) {
  const { client } = await getClient();
  const cleanName = name.trim();
  if (!projectId) throw new Error('projectId is required.');
  if (!cleanName) throw new Error('Folder name is required.');

  const { data: existing, error: lookupError } = await client
    .from('folders')
    .select('*')
    .eq('project_id', projectId)
    .eq('name', cleanName)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return { folder: existing, created: false };

  const { data, error } = await client
    .from('folders')
    .insert({ project_id: projectId, name: cleanName })
    .select('*')
    .single();
  if (error) throw error;
  return { folder: data, created: true };
}

async function ensureCampaign(folderId: string, name: string, type: z.infer<typeof campaignTypeSchema>, deadline?: string | null) {
  const { client } = await getClient();
  const cleanName = name.trim();
  if (!folderId) throw new Error('folderId is required.');
  if (!cleanName) throw new Error('Campaign name is required.');

  const { data: existing, error: lookupError } = await client
    .from('campaigns')
    .select('*')
    .eq('folder_id', folderId)
    .eq('name', cleanName)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (existing) return { campaign: existing, created: false };

  const { data, error } = await client
    .from('campaigns')
    .insert({ folder_id: folderId, name: cleanName, type, deadline: deadline || null })
    .select('*')
    .single();
  if (error) throw error;
  return { campaign: data, created: true };
}

async function getBrandBundle(guideId: string) {
  const { client } = await getClient();
  const [guide, colors, fonts, logos, logoRules, moodImages, document] = await Promise.all([
    client.from('brand_guides').select('*').eq('id', guideId).maybeSingle(),
    client.from('brand_colors').select('*').eq('guide_id', guideId).order('sort_order'),
    client.from('brand_fonts').select('*').eq('guide_id', guideId).order('sort_order'),
    client.from('brand_logos').select('*').eq('guide_id', guideId).order('sort_order'),
    client.from('brand_logo_rules').select('*').eq('guide_id', guideId).order('sort_order'),
    client.from('brand_mood_images').select('*').eq('guide_id', guideId).order('sort_order'),
    client.from('brand_knowledge_documents').select('*').eq('guide_id', guideId).maybeSingle(),
  ]);
  for (const result of [guide, colors, fonts, logos, logoRules, moodImages, document]) {
    if (result.error) throw result.error;
  }
  return {
    guide: compactRow(guide.data),
    colors: colors.data || [],
    fonts: fonts.data || [],
    logos: (logos.data || []).map(compactRow),
    logoRules: logoRules.data || [],
    moodImages: (moodImages.data || []).map(compactRow),
    knowledgeDocument: compactRow(document.data),
  };
}

async function waitForAiRun(runId: string, timeoutSeconds: number, pollSeconds: number) {
  const { client } = await getClient();
  const deadline = Date.now() + timeoutSeconds * 1000;
  let latest: { run: unknown; steps: unknown[]; events: unknown[]; artifacts: unknown[] } | null = null;

  while (Date.now() <= deadline) {
    const [run, steps, events, artifacts] = await Promise.all([
      client.from('ai_runs').select('*').eq('id', runId).maybeSingle(),
      client.from('ai_run_steps').select('*').eq('run_id', runId).order('sort_order'),
      client.from('ai_run_events').select('*').eq('run_id', runId).order('created_at'),
      client.from('ai_artifacts').select('*').eq('run_id', runId).order('created_at', { ascending: false }),
    ]);
    for (const result of [run, steps, events, artifacts]) {
      if (result.error) throw result.error;
    }
    latest = {
      run: compactRow(run.data),
      steps: steps.data || [],
      events: events.data || [],
      artifacts: artifacts.data || [],
    };

    const status = (run.data as { status?: string } | null)?.status;
    if ((artifacts.data || []).length > 0 || ['needs_approval', 'completed', 'failed', 'canceled'].includes(status || '')) {
      return latest;
    }
    await sleep(Math.max(1, pollSeconds) * 1000);
  }

  return { ...latest, timedOut: true };
}

server.registerTool(
  'socialsuite_whoami',
  {
    title: 'SocialSuite current login',
    description: 'Show the SocialSuite user, active org, exposed tables, and connector defaults.',
    inputSchema: {},
    annotations: { readOnlyHint: true },
  },
  async () => {
    const { client, user, orgId } = await getClient();
    const { data: memberships, error } = await client
      .from('org_members')
      .select('org_id, role, organizations(id, name)')
      .eq('user_id', user.id);
    if (error) throw error;

    return textResult({
      user: { id: user.id, email: user.email },
      activeOrgId: orgId,
      memberships,
      exposedTables: allowedTables,
      defaultLimit: config.defaultLimit,
    });
  },
);

server.registerTool(
  'socialsuite_workspace_overview',
  {
    title: 'SocialSuite workspace overview',
    description: 'Get a practical overview of projects, folders, campaigns, brand guides, notes, tasks, calendar events, and recent AI runs.',
    inputSchema: {
      limit: z.number().int().positive().max(100).default(25),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ limit }) => {
    const { client, orgId } = await getClient();
    if (!orgId) throw new Error('No active SocialSuite organization was found for this login.');

    const [projects, folders, campaigns, brandGuides, notes, tasks, calendarEvents, aiRuns] = await Promise.all([
      client.from('projects').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(limit),
      client.from('folders').select('*, projects!inner(org_id, name)').eq('projects.org_id', orgId).limit(limit),
      client.from('campaigns').select('*, folders!inner(project_id, projects!inner(org_id, name))').eq('folders.projects.org_id', orgId).limit(limit),
      client.from('brand_guides').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(limit),
      client.from('notes').select('id,title,project_id,created_at,updated_at').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(limit),
      client.from('tasks').select('*').eq('org_id', orgId).order('updated_at', { ascending: false }).limit(limit),
      client.from('calendar_events').select('*, campaigns!inner(folder_id, folders!inner(project_id, projects!inner(org_id)))').eq('campaigns.folders.projects.org_id', orgId).order('event_date', { ascending: true }).limit(limit),
      client.from('ai_runs').select('*').eq('org_id', orgId).order('created_at', { ascending: false }).limit(limit),
    ]);
    for (const result of [projects, folders, campaigns, brandGuides, notes, tasks, calendarEvents, aiRuns]) {
      if (result.error) throw result.error;
    }

    return textResult({
      orgId,
      projects: projects.data?.map(compactRow) || [],
      folders: folders.data?.map(compactRow) || [],
      campaigns: campaigns.data?.map(compactRow) || [],
      brandGuides: brandGuides.data?.map(compactRow) || [],
      notes: notes.data || [],
      tasks: tasks.data || [],
      calendarEvents: calendarEvents.data || [],
      recentAiRuns: aiRuns.data?.map(compactRow) || [],
    });
  },
);

server.registerTool(
  'socialsuite_ensure_project',
  {
    title: 'Create or find SocialSuite project',
    description: 'Create a project if it does not already exist by exact name.',
    inputSchema: {
      name: z.string().min(1),
    },
  },
  async ({ name }) => textResult(await ensureProject(name)),
);

server.registerTool(
  'socialsuite_ensure_folder',
  {
    title: 'Create or find SocialSuite folder',
    description: 'Create a folder in a project if it does not already exist by exact name.',
    inputSchema: {
      projectId: z.string().min(1),
      name: z.string().min(1).default('General'),
    },
  },
  async ({ projectId, name }) => textResult(await ensureFolder(projectId, name)),
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
  async ({ folderId, name, type, deadline }) => textResult(await ensureCampaign(folderId, name, type, deadline)),
);

server.registerTool(
  'socialsuite_get_project_context',
  {
    title: 'Get SocialSuite project context',
    description: 'Read a project with its folders, campaigns, content counts, brand guides, tasks, notes, and recent AI runs.',
    inputSchema: {
      projectId: z.string().min(1),
      limit: z.number().int().positive().max(100).default(50),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ projectId, limit }) => {
    const { client, orgId } = await getClient();
    const [project, folders, brandGuides, notes, tasks, aiRuns] = await Promise.all([
      client.from('projects').select('*').eq('id', projectId).eq('org_id', orgId || '').maybeSingle(),
      client.from('folders').select('*, campaigns(*, content_items(id,type,status), calendar_events(*))').eq('project_id', projectId).limit(limit),
      client.from('brand_guides').select('*').eq('project_id', projectId).limit(limit),
      client.from('notes').select('id,title,project_id,created_at,updated_at').eq('project_id', projectId).limit(limit),
      client.from('tasks').select('*').eq('project_id', projectId).limit(limit),
      client.from('ai_runs').select('*').eq('project_id', projectId).order('created_at', { ascending: false }).limit(limit),
    ]);
    for (const result of [project, folders, brandGuides, notes, tasks, aiRuns]) {
      if (result.error) throw result.error;
    }
    return textResult({
      project: compactRow(project.data),
      folders: folders.data || [],
      brandGuides: brandGuides.data?.map(compactRow) || [],
      notes: notes.data || [],
      tasks: tasks.data || [],
      recentAiRuns: aiRuns.data?.map(compactRow) || [],
    });
  },
);

server.registerTool(
  'socialsuite_setup_brand_from_website',
  {
    title: 'Set up SocialSuite brand from website',
    description: 'Create/find a project and brand guide, run website research, charge the brand research action, compile the knowledge base, charge knowledge generation, and return the finished brand bundle.',
    inputSchema: {
      projectName: z.string().min(1),
      brandName: z.string().min(1),
      websiteUrl: z.string().min(1),
      projectId: z.string().nullable().optional(),
    },
  },
  async ({ projectName, brandName, websiteUrl, projectId }) => {
    const { client, orgId } = await getClient();
    if (!orgId) throw new Error('No active SocialSuite organization was found for this login.');
    const cleanUrl = normalizeWebsiteUrl(websiteUrl);
    const projectResult = projectId ? { project: { id: projectId, name: projectName }, created: false } : await ensureProject(projectName);

    const { data: existingGuide, error: guideLookupError } = await client
      .from('brand_guides')
      .select('*')
      .eq('org_id', orgId)
      .eq('project_id', projectResult.project.id)
      .eq('brand_name', brandName.trim())
      .maybeSingle();
    if (guideLookupError) throw guideLookupError;

    let guide = existingGuide;
    let guideCreated = false;
    if (!guide) {
      const { data, error } = await client
        .from('brand_guides')
        .insert({
          org_id: orgId,
          project_id: projectResult.project.id,
          brand_name: brandName.trim(),
          website_url: cleanUrl,
        })
        .select('*')
        .single();
      if (error) throw error;
      guide = data;
      guideCreated = true;
    } else if (guide.website_url !== cleanUrl) {
      const { data, error } = await client
        .from('brand_guides')
        .update({ website_url: cleanUrl })
        .eq('id', guide.id)
        .select('*')
        .single();
      if (error) throw error;
      guide = data;
    }

    const research = await invokeFunction('brand-research-website', {
      guideId: guide.id,
      brandName: brandName.trim(),
      websiteUrl: cleanUrl,
    });
    const researchCharge = await invokeFunction('brand-charge-ai-action', {
      guideId: guide.id,
      action: 'brand_research',
    });
    const knowledge = await invokeFunction('brand-compile-knowledge', { guideId: guide.id });
    const knowledgeCharge = await invokeFunction('brand-charge-ai-action', {
      guideId: guide.id,
      action: 'brand_knowledge',
    });
    const bundle = await getBrandBundle(guide.id);

    return textResult({
      project: projectResult.project,
      projectCreated: projectResult.created,
      brandGuideCreated: guideCreated,
      research,
      researchCharge,
      knowledge,
      knowledgeCharge,
      bundle,
    });
  },
);

server.registerTool(
  'socialsuite_get_brand_bundle',
  {
    title: 'Get SocialSuite brand bundle',
    description: 'Read a brand guide plus colors, fonts, logos, logo rules, mood images, and compiled knowledge document.',
    inputSchema: {
      guideId: z.string().min(1),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ guideId }) => textResult(await getBrandBundle(guideId)),
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
  async ({ campaignId, type, name, status, payload }) => {
    const { client } = await getClient();
    const { data, error } = await client
      .from('content_items')
      .insert({ campaign_id: campaignId, type, name: name || null, status, payload })
      .select('*')
      .single();
    if (error) throw error;
    return textResult({ contentItem: compactRow(data) });
  },
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
  async ({ title, description, status, dueDate, projectId, folderId, campaignId, assigneeId }) => {
    const { client, orgId } = await getClient();
    if (!orgId) throw new Error('No active SocialSuite organization was found for this login.');
    const { data, error } = await client
      .from('tasks')
      .insert({
        org_id: orgId,
        title,
        description: description || null,
        status,
        due_date: dueDate || null,
        project_id: projectId || null,
        folder_id: folderId || null,
        campaign_id: campaignId || null,
        assignee_id: assigneeId || null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return textResult({ task: compactRow(data) });
  },
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
  async ({ campaignId, title, eventDate, type }) => {
    const { client } = await getClient();
    const { data, error } = await client
      .from('calendar_events')
      .insert({ campaign_id: campaignId, title, event_date: eventDate, type })
      .select('*')
      .single();
    if (error) throw error;
    return textResult({ calendarEvent: compactRow(data) });
  },
);

server.registerTool(
  'socialsuite_create_note',
  {
    title: 'Create SocialSuite note',
    description: 'Create a project or workspace note. Plain text is converted into a simple BlockNote-compatible paragraph.',
    inputSchema: {
      title: z.string().min(1),
      text: z.string().default(''),
      projectId: z.string().nullable().optional(),
      content: z.array(z.unknown()).optional(),
    },
  },
  async ({ title, text, projectId, content }) => {
    const { client, orgId, user } = await getClient();
    if (!orgId) throw new Error('No active SocialSuite organization was found for this login.');
    const noteContent = content || [{
      id: crypto.randomUUID(),
      type: 'paragraph',
      props: {},
      content: text ? [{ type: 'text', text, styles: {} }] : [],
      children: [],
    }];
    const { data, error } = await client
      .from('notes')
      .insert({
        org_id: orgId,
        project_id: projectId || null,
        title,
        content: noteContent,
        created_by: user.id,
      })
      .select('*')
      .single();
    if (error) throw error;
    return textResult({ note: compactRow(data) });
  },
);

server.registerTool(
  'socialsuite_start_campaign_mission',
  {
    title: 'Start SocialSuite campaign mission',
    description: 'Start a Brief to Campaign mission with explicit mode, model provider, and research provider so Hermes does not accidentally default to Instant.',
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
  async ({
    brief,
    workMode,
    modelPreference,
    researchProvider,
    projectId,
    folderId,
    campaignId,
    brandGuideId,
    brandKnowledgeDocumentId,
    extraContext,
    waitForArtifact,
    waitTimeoutSeconds,
  }) => {
    const modelId = modelIdFor(workMode, modelPreference);
    const researchProviderName = researchProvider === 'tavily' ? 'Tavily' : 'Perplexity';
    const response = await invokeFunction<{ run: { id: string }; artifact?: unknown }>('ai-start-run', {
      prompt: brief,
      projectId: projectId || null,
      folderId: folderId || null,
      campaignId: campaignId || null,
      brandGuideId: brandGuideId || null,
      brandKnowledgeDocumentId: brandKnowledgeDocumentId || null,
      context: {
        ...extraContext,
        workMode,
        aiModelId: modelId,
        researchProvider,
        researchProviderName,
        researchModel: researchProvider === 'perplexity' ? 'perplexity/sonar-pro' : null,
      },
    });
    const waited = waitForArtifact && response.run?.id
      ? await waitForAiRun(response.run.id, waitTimeoutSeconds, 3)
      : null;
    return textResult({
      requested: { workMode, modelPreference, modelId, researchProvider },
      response,
      waited,
    });
  },
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
  async ({ runId, timeoutSeconds, pollSeconds }) => textResult(await waitForAiRun(runId, timeoutSeconds, pollSeconds)),
);

server.registerTool(
  'socialsuite_list_rows',
  {
    title: 'List SocialSuite rows',
    description: 'List rows from an exposed SocialSuite table. Supports simple filters and ordering.',
    inputSchema: {
      table: z.enum(allowedTables),
      select: z.string().default('*'),
      filters: z.array(filterSchema).default([]),
      orderBy: z.string().optional(),
      ascending: z.boolean().default(false),
      limit: z.number().int().positive().max(250).default(config.defaultLimit),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ table, select, filters, orderBy, ascending, limit }) => {
    const { client } = await getClient();
    let query = client.from(assertAllowedTable(table)).select(select).limit(limit);
    query = applyFilters(query, filters);
    if (orderBy) query = query.order(orderBy, { ascending });

    const { data, error } = await query;
    if (error) throw error;
    return textResult({ table, count: data?.length ?? 0, rows: (data || []).map(compactRow) });
  },
);

server.registerTool(
  'socialsuite_get_row',
  {
    title: 'Get SocialSuite row',
    description: 'Fetch one row by id from an exposed SocialSuite table.',
    inputSchema: {
      table: z.enum(allowedTables),
      id: z.string().min(1),
      select: z.string().default('*'),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ table, id, select }) => {
    const { client } = await getClient();
    const { data, error } = await client.from(assertAllowedTable(table)).select(select).eq('id', id).maybeSingle();
    if (error) throw error;
    return textResult({ table, row: compactRow(data) });
  },
);

server.registerTool(
  'socialsuite_create_row',
  {
    title: 'Create SocialSuite row',
    description: 'Create a row in an exposed SocialSuite table using the Hermes SocialSuite user.',
    inputSchema: {
      table: z.enum(allowedTables),
      values: jsonObjectSchema,
      select: z.string().default('*'),
    },
  },
  async ({ table, values, select }) => {
    const { client, orgId } = await getClient();
    const insertValues = { ...values };
    if (orgId && !('org_id' in insertValues) && ['tasks', 'notes', 'feed_folders', 'feed_posts'].includes(table)) {
      insertValues.org_id = orgId;
    }

    const { data, error } = await client.from(assertAllowedTable(table)).insert(insertValues).select(select).single();
    if (error) throw error;
    return textResult({ table, row: compactRow(data) });
  },
);

server.registerTool(
  'socialsuite_update_row',
  {
    title: 'Update SocialSuite row',
    description: 'Update one row by id in an exposed SocialSuite table.',
    inputSchema: {
      table: z.enum(allowedTables),
      id: z.string().min(1),
      values: jsonObjectSchema,
      select: z.string().default('*'),
    },
  },
  async ({ table, id, values, select }) => {
    const { client } = await getClient();
    const { data, error } = await client.from(assertAllowedTable(table)).update(values).eq('id', id).select(select).single();
    if (error) throw error;
    return textResult({ table, row: compactRow(data) });
  },
);

server.registerTool(
  'socialsuite_delete_rows',
  {
    title: 'Delete SocialSuite rows',
    description: 'Delete rows from an exposed SocialSuite table. Filters are required.',
    inputSchema: {
      table: z.enum(allowedTables),
      filters: z.array(filterSchema).min(1),
    },
  },
  async ({ table, filters }) => {
    const { client } = await getClient();
    let query = client.from(assertAllowedTable(table)).delete({ count: 'exact' });
    query = applyFilters(query, filters);
    const { count, error } = await query;
    if (error) throw error;
    return textResult({ table, deletedCount: count });
  },
);

server.registerTool(
  'socialsuite_start_ai_mission',
  {
    title: 'Start SocialSuite AI mission',
    description: 'Start a Brief to Campaign AI mission through the existing SocialSuite Edge Function.',
    inputSchema: {
      prompt: z.string().min(1),
      projectId: z.string().nullable().optional(),
      folderId: z.string().nullable().optional(),
      campaignId: z.string().nullable().optional(),
      brandGuideId: z.string().nullable().optional(),
      brandKnowledgeDocumentId: z.string().nullable().optional(),
      context: jsonObjectSchema.default({}),
    },
  },
  async (input) => textResult(await invokeFunction('ai-start-run', input as JsonObject)),
);

server.registerTool(
  'socialsuite_get_ai_run_details',
  {
    title: 'Get SocialSuite AI run details',
    description: 'Read an AI run, steps, events, and artifacts.',
    inputSchema: {
      runId: z.string().min(1),
    },
    annotations: { readOnlyHint: true },
  },
  async ({ runId }) => {
    const { client } = await getClient();
    const [run, steps, events, artifacts] = await Promise.all([
      client.from('ai_runs').select('*').eq('id', runId).maybeSingle(),
      client.from('ai_run_steps').select('*').eq('run_id', runId).order('sort_order'),
      client.from('ai_run_events').select('*').eq('run_id', runId).order('created_at'),
      client.from('ai_artifacts').select('*').eq('run_id', runId).order('created_at', { ascending: false }),
    ]);
    for (const result of [run, steps, events, artifacts]) {
      if (result.error) throw result.error;
    }
    return textResult({
      run: compactRow(run.data),
      steps: steps.data,
      events: events.data,
      artifacts: artifacts.data,
    });
  },
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
  async (input) => textResult(await invokeFunction('ai-commit-run', input as JsonObject)),
);

server.registerTool(
  'socialsuite_cancel_ai_mission',
  {
    title: 'Cancel SocialSuite AI mission',
    description: 'Cancel an active SocialSuite AI mission.',
    inputSchema: {
      runId: z.string().min(1),
    },
  },
  async (input) => textResult(await invokeFunction('ai-cancel-run', input as JsonObject)),
);

server.registerTool(
  'socialsuite_invoke_edge_function',
  {
    title: 'Invoke SocialSuite Edge Function',
    description: 'Invoke an exposed SocialSuite Edge Function by name.',
    inputSchema: {
      name: z.enum([
        'ai-start-run',
        'ai-commit-run',
        'ai-cancel-run',
        'brand-research-website',
        'brand-compile-knowledge',
        'brand-charge-ai-action',
        'brand-analyze-visual-direction',
        'generate-visual-asset',
      ]),
      body: jsonObjectSchema.default({}),
    },
  },
  async ({ name, body }) => textResult(await invokeFunction(name, body)),
);

const transport = new StdioServerTransport();
await server.connect(transport);
