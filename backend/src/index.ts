import express from 'express';
import { createApp } from './create-app.js';
import { loadEnv } from './config/env.js';
import { createSupabaseFactory } from './lib/supabase.js';
import { createDatabase } from './lib/database.js';

const env = loadEnv();
export const database = createDatabase(env.DATABASE_URL);
const app: express.Express = createApp({
  database,
  createClient: createSupabaseFactory(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY),
  corsOrigins: env.CORS_ORIGINS, trustProxyHops: env.TRUST_PROXY_HOPS,
});
export default app;
