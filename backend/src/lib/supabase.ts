import { createClient } from '@supabase/supabase-js';
import type { ClientFactory } from '../domain/models.js';

export function createSupabaseFactory(url: string, key: string): ClientFactory {
  return (accessToken) => createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {} },
  });
}
