/**
 * supabase.ts — Supabase client configuration
 *
 * Security rules:
 * - SUPABASE_URL and SUPABASE_ANON_KEY must come from environment variables
 * - SUPABASE_SERVICE_ROLE_KEY (admin SDK) must NEVER be exposed to the frontend
 * - If keys are missing in production, the server fails loudly at startup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Fail hard in production if Supabase credentials are missing
if (process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('❌ FATAL: SUPABASE_URL and SUPABASE_ANON_KEY must be set in production environment.');
  }
  if (!supabaseServiceKey) {
    throw new Error('❌ FATAL: SUPABASE_SERVICE_ROLE_KEY must be set in production environment.');
  }
} else {
  // Development: warn but do not crash
  if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Supabase URL or Anon Key not configured. Auth operations may fail in development.');
  }
}

export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '');

// Admin client — uses service role key which bypasses RLS
// NEVER expose this key to the frontend or include in client bundles
export const supabaseAdmin = createClient(supabaseUrl || '', supabaseServiceKey || '', {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});
