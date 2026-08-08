import { createClient } from "@/lib/supabase/server";
import { getPrimaryPhotoUrls } from "@/lib/photos";

// Only Search re-fetches its candidate list client-side (re-filtering);
// every other page (Recommendations/Saved/Matches) is a pure Server
// Component and calls getPrimaryPhotoUrls directly. This route exists
// so that client-side re-fetch can still get signed URLs without
// exposing the service-role key to the browser. Low-stakes even for an
// arbitrary id list: it only ever returns URLs for approved, type
// 'profile' photos — the same "publicly visible to any authenticated
// user" data already exposed via published_profiles/Search itself.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { userIds } = body as { userIds?: string[] };
  if (!Array.isArray(userIds)) {
    return Response.json({ error: "userIds must be an array." }, { status: 400 });
  }

  const urls = await getPrimaryPhotoUrls(userIds);
  return Response.json({ urls: Object.fromEntries(urls) });
}
