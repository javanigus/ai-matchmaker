import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client — bypasses RLS entirely. Server-only, never
// import from a client component. Used for: signed photo URLs (cross-
// user reads that deliberately have no client-facing RLS policy),
// moderation_status writes (no authenticated UPDATE policy exists on
// photos by design), and Storage object writes during upload.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
