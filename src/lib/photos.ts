import { createAdminClient } from "@/lib/supabase/admin";

const BUCKET = "photos";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — long enough for a page view, short-lived by design

export type OwnPhoto = {
  id: string;
  type: "learning" | "profile";
  moderationStatus: "pending" | "approved" | "rejected";
  moderationReason: string | null;
  position: number | null;
  storagePath: string;
  url: string;
};

// Trusts its input list is already published+block-filtered by the
// caller — same trust boundary already used for
// published_profile_categories reads elsewhere in this app. Only
// returns a photo for users with at least one approved profile photo;
// callers should fall back to the existing placeholder for anyone
// missing from the returned map.
export async function getPrimaryPhotoUrls(userIds: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (userIds.length === 0) return result;

  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("photos")
    .select("user_id, storage_path, position")
    .in("user_id", userIds)
    .eq("type", "profile")
    .eq("moderation_status", "approved")
    .order("position", { ascending: true, nullsFirst: false });
  if (!rows || rows.length === 0) return result;

  const primaryByUser = new Map<string, string>();
  for (const row of rows) {
    if (!primaryByUser.has(row.user_id)) primaryByUser.set(row.user_id, row.storage_path);
  }

  const paths = [...primaryByUser.values()];
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  if (!signed) return result;

  const urlByPath = new Map(signed.filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl as string]));
  for (const [userId, path] of primaryByUser) {
    const url = urlByPath.get(path);
    if (url) result.set(userId, url);
  }
  return result;
}

// Owner's own grid — every status, not just approved.
export async function getOwnPhotoUrls(userId: string): Promise<OwnPhoto[]> {
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("photos")
    .select("id, type, storage_path, moderation_status, moderation_reason, position")
    .eq("user_id", userId)
    .order("position", { ascending: true, nullsFirst: false });
  if (!rows || rows.length === 0) return [];

  const paths = rows.map((r) => r.storage_path);
  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrls(paths, SIGNED_URL_TTL_SECONDS);
  const urlByPath = new Map((signed ?? []).filter((s) => s.signedUrl).map((s) => [s.path, s.signedUrl as string]));

  return rows
    .filter((r) => urlByPath.has(r.storage_path))
    .map((r) => ({
      id: r.id,
      type: r.type,
      moderationStatus: r.moderation_status,
      moderationReason: r.moderation_reason,
      position: r.position,
      storagePath: r.storage_path,
      url: urlByPath.get(r.storage_path)!,
    }));
}
