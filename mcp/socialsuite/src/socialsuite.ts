import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { config } from './config.js';

export type JsonObject = Record<string, unknown>;

export const allowedTables = [
  'organizations',
  'org_members',
  'projects',
  'folders',
  'campaigns',
  'content_items',
  'tasks',
  'calendar_events',
  'notes',
  'feed_folders',
  'feed_posts',
  'portal_clients',
  'portal_feeds',
  'portal_review_posts',
  'portal_comments',
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
  'ai_credit_accounts',
] as const;

export type AllowedTable = typeof allowedTables[number];

const allowedTableSet = new Set<string>(allowedTables);
let client: SupabaseClient | null = null;
let user: User | null = null;
let activeOrgId: string | null = config.orgId;

export const assertAllowedTable = (table: string): AllowedTable => {
  if (!allowedTableSet.has(table)) {
    throw new Error(`Table "${table}" is not exposed by this connector.`);
  }
  return table as AllowedTable;
};

export async function getClient() {
  if (client && user) return { client, user, orgId: activeOrgId };

  client = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const { data, error } = await client.auth.signInWithPassword({
    email: config.email,
    password: config.password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('SocialSuite login succeeded without a user.');
  user = data.user;

  if (!activeOrgId) {
    const { data: membership, error: membershipError } = await client
      .from('org_members')
      .select('org_id, role')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle();
    if (membershipError) throw membershipError;
    activeOrgId = (membership as { org_id?: string } | null)?.org_id || null;
  }

  return { client, user, orgId: activeOrgId };
}

export async function invokeFunction<T>(name: string, body: JsonObject): Promise<T> {
  const { client: supabase } = await getClient();
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) throw error;
  const payload = data as T & { error?: string; message?: string };
  if (payload && typeof payload === 'object' && payload.error) {
    throw new Error(payload.error || payload.message || `SocialSuite function ${name} failed.`);
  }
  return payload as T;
}

export function compactRow(row: unknown) {
  if (!row || typeof row !== 'object') return row;
  const value = row as JsonObject;
  const result: JsonObject = {};
  for (const [key, field] of Object.entries(value)) {
    if (key.includes('token') || key.includes('password') || key.includes('secret')) continue;
    result[key] = field;
  }
  return result;
}

export function textResult(value: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(value, null, 2),
      },
    ],
  };
}
