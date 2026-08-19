import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';

dotenv.config({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const required = (name: string) => {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const config = {
  supabaseUrl: required('SOCIALSUITE_SUPABASE_URL'),
  supabaseAnonKey: required('SOCIALSUITE_SUPABASE_ANON_KEY'),
  email: required('SOCIALSUITE_HERMES_EMAIL'),
  password: required('SOCIALSUITE_HERMES_PASSWORD'),
  orgId: process.env.SOCIALSUITE_ORG_ID?.trim() || null,
  defaultLimit: Number(process.env.SOCIALSUITE_DEFAULT_LIMIT || 25),
};
