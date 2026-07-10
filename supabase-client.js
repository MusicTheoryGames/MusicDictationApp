/**
 * @file supabase-client.js
 * The imperative shell's single Supabase client (VISION §8). It is the shell's
 * entry point for anonymous sign-in and Realtime, and for RLS-guarded reads/writes
 * once the schema and its policies exist. `core/` stays pure — all network I/O lives
 * in the shell. The client is also bridged onto `window` (the `core-bridge.js`
 * pattern) so the app's classic scripts can reach it in later steps.
 */
import { createClient } from './vendor/supabase.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from './supabase-config.js';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

if (typeof window !== 'undefined') window.supabaseClient = supabase;
