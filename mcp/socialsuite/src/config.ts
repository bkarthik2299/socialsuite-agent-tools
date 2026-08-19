import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const optional = (name: string) => process.env[name]?.trim() || '';

const supabaseUrl = required('SOCIALSUITE_SUPABASE_URL').replace(/\/$/, '');

export const config = {
  supabaseUrl,
  supabaseAnonKey: optional('SOCIALSUITE_SUPABASE_ANON_KEY'),
  email: optional('SOCIALSUITE_HERMES_EMAIL'),
  password: optional('SOCIALSUITE_HERMES_PASSWORD'),
  orgId: process.env.SOCIALSUITE_ORG_ID?.trim() || null,
  defaultLimit: Number(process.env.SOCIALSUITE_DEFAULT_LIMIT || 25),
  apiKey: optional('SOCIALSUITE_API_KEY'),
  agentApiUrl: optional('SOCIALSUITE_AGENT_API_URL') || `${supabaseUrl}/functions/v1/agent-api`,
};
