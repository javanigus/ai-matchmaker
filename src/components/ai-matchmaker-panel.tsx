"use client";

import { useEffect, useRef, useState } from "react";
import { renderMessageContent } from "@/lib/chat/render-message-content";

type ChatMessage = { role: "user" | "assistant"; content: string };

const OPENING_MESSAGE = "Hey, I'm here whenever you want to talk — about a match, your profile, or anything else on your mind.";

// Persistent AI Matchmaker panel (technical-plan.md's UX walkthrough
// step 9: "no 'onboarding mode' to exit — the same AI Matchmaker is just
// always available... on every page from then on"). Deliberately scoped
// down from prototype/*.html's version of this panel: no mobile drawer,
// no quiet-mode menu (Ask fewer questions / Pause suggestions — pure
// prototype flavor with no backing mechanism specified anywhere in prd.md
// or technical-plan.md beyond the UI itself), no AI-initiated suggestion
// chips. What's real here is the actual mechanism this phase is about —
// wiring to /api/chat/message (live reply, no extraction) and
// /api/chat/close-session (explicit session-close, batched extraction) —
// not the full chrome. A page mounting this must already know
// baselineReached is true; rendering pre-baseline would call an API that
// 403s (the route enforces this server-side too, as defense in depth).
//
// Doesn't rehydrate an in-progress conversation's history on mount the
// way onboarding's page does — a deliberate scope cut, not an oversight.
// The underlying conversation row is still correctly resumed server-side
// (see /api/chat/message's lookup-most-recent-open-conversation logic),
// so nothing about session-close extraction is affected by this; only
// the visible transcript resets per page load, matching the prototype's
// own always-fresh-greeting behavior.
export default function AiMatchmakerPanel() {
  const [collapsed, setCollapsed] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: OPENING_MESSAGE }]);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [closing, setClosing] = useState(false);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send() {
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);

    const res = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: text }),
    });
    setSending(false);

    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong on my end — try again in a moment." }]);
      return;
    }
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
  }

  async function endConversation() {
    if (!conversationId || closing) return;
    setClosing(true);
    await fetch("/api/chat/close-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conversationId }),
    });
    setClosing(false);
    setConversationId(null);
    setMessages([{ role: "assistant", content: "Talk soon — I'll fold anything new I learned into your profile for you to review." }]);
  }

  if (collapsed) {
    return (
      <button
        type="button"
        onClick={() => setCollapsed(false)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-accent-600 text-white shadow-lg flex items-center justify-center hover:bg-accent-700"
        aria-label="Open AI Matchmaker"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2V6z" />
        </svg>
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[380px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-4rem)] bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-stone-100 shrink-0">
        <div>
          <p className="text-sm font-semibold text-stone-800">AI Matchmaker</p>
          <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Available
          </span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {conversationId && (
            <button
              type="button"
              onClick={endConversation}
              disabled={closing}
              className="text-xs font-medium text-stone-400 hover:text-stone-600 disabled:opacity-50"
            >
              {closing ? "Ending…" : "End conversation"}
            </button>
          )}
          <button type="button" onClick={() => setCollapsed(true)} aria-label="Minimize" className="text-stone-400 hover:text-stone-600">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-accent-600 text-white rounded-2xl rounded-br-md px-3.5 py-2 text-sm"
                : "mr-auto max-w-[85%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-3.5 py-2 text-sm leading-relaxed"
            }
          >
            {renderMessageContent(m.content)}
          </div>
        ))}
        {sending && <div className="mr-auto text-xs text-stone-400 italic px-1">Thinking…</div>}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="border-t border-stone-100 p-2.5 flex items-end gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your AI Matchmaker…"
          className="flex-1 min-w-0 text-sm bg-stone-100 rounded-full px-3.5 py-2 focus:outline-none focus:ring-2 focus:ring-accent-300"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-full bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l16-7-6.5 16-3-6.5L4 12z" />
          </svg>
        </button>
      </form>
    </div>
  );
}
