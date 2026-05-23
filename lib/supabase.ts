// Browser Supabase client. The dev-open-rls policies are in effect, so the anon
// key has full read+write access — matches the HTML prototype.
// v1.1 will swap in @supabase/ssr + magic-link auth and re-apply the strict
// per-email policies from supabase/migration.sql.

import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _sb: SupabaseClient | null = null;

export function sb(): SupabaseClient {
  if (_sb) return _sb;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — see .env.local.example",
    );
  }
  _sb = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _sb;
}
