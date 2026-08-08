import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { moderatePhoto } from "@/lib/moderation/moderate-photo";

const ALLOWED_MIME_TO_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};
const MAX_BYTES = 8 * 1024 * 1024; // 8MB
const BUCKET = "photos";

// Photos require a baseline-complete profile (proxy.ts's GATED_PATHS
// is page-route-only and never covers /api/*, so this is checked
// explicitly here, same as every other API route in this app already
// does its own auth/scope checks).
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: userRow } = await supabase.from("users").select("baseline_reached_at").eq("id", user.id).single();
  if (!userRow?.baseline_reached_at) {
    return Response.json({ error: "Complete onboarding before adding photos." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const type = formData.get("type");
  if (!(file instanceof File) || (type !== "learning" && type !== "profile")) {
    return Response.json({ error: "A photo file and a valid type are required." }, { status: 400 });
  }

  const ext = ALLOWED_MIME_TO_EXT[file.type];
  if (!ext) {
    return Response.json({ error: "Only JPEG, PNG, or WebP photos are allowed." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return Response.json({ error: "Photos must be 8MB or smaller." }, { status: 400 });
  }

  const admin = createAdminClient();
  const photoId = crypto.randomUUID();
  const path = `${user.id}/${photoId}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await admin.storage.from(BUCKET).upload(path, buffer, { contentType: file.type });
  if (uploadError) {
    return Response.json({ error: "Couldn't upload that photo — try again." }, { status: 500 });
  }

  const { data: inserted, error: insertError } = await supabase
    .from("photos")
    .insert({ id: photoId, user_id: user.id, type, storage_path: path, moderation_status: "pending" })
    .select("id, type, storage_path, moderation_status, moderation_reason, position")
    .single();
  if (insertError || !inserted) {
    await admin.storage.from(BUCKET).remove([path]);
    return Response.json({ error: "Couldn't save that photo — try again." }, { status: 500 });
  }

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(path, 300);
  const decision = signed?.signedUrl ? await moderatePhoto(signed.signedUrl) : null;

  if (decision) {
    const { data: updated } = await admin
      .from("photos")
      .update({ moderation_status: decision.decision === "approve" ? "approved" : "rejected", moderation_reason: decision.reason })
      .eq("id", photoId)
      .select("id, type, storage_path, moderation_status, moderation_reason, position")
      .single();
    if (updated) {
      return Response.json({ photo: updated, stillChecking: false });
    }
  }

  // Moderation didn't resolve (LLM failure after retry, or the signed
  // URL couldn't be generated) — leave moderation_status at its
  // default 'pending' rather than fake a result. The true status shows
  // on next page load either way, since My Profile is a Server
  // Component reading fresh each load.
  return Response.json({ photo: inserted, stillChecking: true });
}
