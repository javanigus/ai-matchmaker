import { createClient } from "@/lib/supabase/server";
import { closeSession } from "@/lib/chat/close-session";

// Explicit "End conversation" trigger — the "user navigating away" half
// of technical-plan.md's two named session-close triggers (the other,
// inactivity timeout, is handled lazily in /api/chat/message). Called
// by the persistent panel when the user deliberately ends a chat,
// rather than an unload hook — see that route's comment for why.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await request.json();
  const { conversationId } = body as { conversationId?: string };
  if (!conversationId) {
    return Response.json({ error: "conversationId required" }, { status: 400 });
  }

  const result = await closeSession(supabase, user.id, conversationId);
  return Response.json(result);
}
