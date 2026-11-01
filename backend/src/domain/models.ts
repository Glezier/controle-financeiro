import type { SupabaseClient, User } from '@supabase/supabase-js';

export type EntryType = 'income' | 'expense';
export type EntryStatus = 'paid' | 'pending';
export interface Category {
  id: string;
  user_id: string;
  name: string;
  type: EntryType;
  icon: string;
  created_at: string;
}
export interface Transaction {
  id: string;
  user_id: string;
  category_id: string;
  type: EntryType;
  amount: number;
  date: string;
  description: string;
  status: EntryStatus;
  created_at: string;
}
export type ClientFactory = (accessToken?: string) => SupabaseClient;
export interface RequestContext {
  user: User;
  accessToken: string;
}

declare global {
  namespace Express {
    interface Request { context?: RequestContext }
  }
}
