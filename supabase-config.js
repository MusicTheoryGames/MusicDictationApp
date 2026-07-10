/**
 * @file supabase-config.js
 * Public Supabase connection config — ONE project for the whole suite (VISION §8/§11).
 *
 * The publishable key is PUBLIC by design; row-level security — not key secrecy — is
 * the security model (policies are added later, with the schema), so this key is safe
 * to commit (as the archived Firebase config was). The SECRET key (`sb_secret_…`) must
 * NEVER appear here, in the repo, or in the browser — it bypasses RLS.
 */
export const SUPABASE_URL = 'https://tirrrlpzaznbgycbcacc.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_e-iDwRztATo8VYn-FNxslA_8lOs-oaz';
