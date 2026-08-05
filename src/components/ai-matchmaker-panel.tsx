"use client";

import { useEffect, useRef, useState } from "react";
import { renderMessageContent } from "@/lib/chat/render-message-content";
import type { Category } from "@/lib/categories";

type ChatMessage = { role: "user" | "assistant"; content: string };
type SuggestedCategory = { key: Category; label: string } | null;

const OPENING_MESSAGE = "Hey, I'm here whenever you want to talk — about your profile, how the app works, or dating in general.";

// Persistent AI Matchmaker panel (technical-plan.md's UX walkthrough
// step 9: "no 'onboarding mode' to exit — the same AI Matchmaker is just
// always available... on every page from then on"). Deliberately scoped
// down from prototype/*.html's version of this panel: no mobile drawer,
// no quiet-mode menu (Ask fewer questions / Pause suggestions — pure
// prototype flavor with no backing mechanism specified anywhere in prd.md
// or technical-plan.md beyond the UI itself), no AI-initiated suggestion
// chips beyond the real "Fill in X" one below. What's real here is the
// actual mechanism this phase is about — wiring to /api/chat/message
// (live reply, no extraction) and /api/chat/close-session (explicit
// session-close, batched extraction) — not the full chrome. A page
// mounting this must already know baselineReached is true; rendering
// pre-baseline would call an API that 403s (the route enforces this
// server-side too, as defense in depth).
//
// Full-height right-edge pane, matching the mockup, per founder feedback
// after the first cut (a small floating box) needed too much internal
// scrolling. Unlike the mockup's version, this overlays fixed on top of
// page content rather than sitting in a flex layout that reserves space
// for it — every page in this app so far is a plain centered <main>, not
// a flex shell with a dedicated content+sidebar split, and building that
// shell now felt like more restructuring than this phase called for.
// Real tradeoff to revisit later: on a narrower desktop viewport, the
// open panel can cover the right edge of wide content (e.g. Search's
// grid) rather than pushing it over.
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
  // Per founder request: filling in an "Additional category" (Travel,
  // Fitness, etc.) through ordinary conversation follows the exact same
  // two-step pattern onboarding uses for the baseline 6 — a quick pick
  // (rendered as tappable chips, same as onboarding), then an open-ended
  // follow-up. Which step is next is tracked server-side (conversations.
  // active_category/_step — see /api/chat/message), since ordinary
  // chat's extraction is batched, not live, so the database alone can't
  // tell the two steps apart turn-to-turn the way onboarding can.
  const [quickReplyOptions, setQuickReplyOptions] = useState<string[] | null>(null);
  // A real "Fill in X" action, not the AI trying to ask its own
  // freeform sub-questions — that's what let it ad-lib three different
  // open bullet questions at once before this existed. Starting a
  // structured flow is always this explicit trigger, never inferred
  // from what the user happens to type.
  const [suggestedCategory, setSuggestedCategory] = useState<SuggestedCategory>(null);
  const transcriptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    transcriptRef.current?.scrollTo({ top: transcriptRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(text: string) {
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setQuickReplyOptions(null);
    setSuggestedCategory(null);
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
    setQuickReplyOptions(data.quickReplyOptions ?? null);
    setSuggestedCategory(data.suggestedCategory ?? null);
  }

  async function startCategory(category: Category) {
    if (sending) return;
    setQuickReplyOptions(null);
    setSuggestedCategory(null);
    setSending(true);

    const res = await fetch("/api/chat/message", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ startCategory: category }),
    });
    setSending(false);

    if (!res.ok) {
      setMessages((m) => [...m, { role: "assistant", content: "Sorry, something went wrong on my end — try again in a moment." }]);
      return;
    }
    const data = await res.json();
    setConversationId(data.conversationId);
    setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    setQuickReplyOptions(data.quickReplyOptions ?? null);
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
    setQuickReplyOptions(null);
    setSuggestedCategory(null);
    setMessages([{ role: "assistant", content: "Talk soon — I'll fold anything new I learned into your profile for you to review." }]);
  }

  if (collapsed) {
    return (
      <div className="fixed inset-y-0 right-0 z-40 w-14 bg-white border-l border-stone-200 shadow-lg flex flex-col items-center py-4 gap-4">
        <button type="button" onClick={() => setCollapsed(false)} aria-label="Open AI Matchmaker" className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-accent-600">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 6l-6 6 6 6" />
          </svg>
        </button>
        <div className="w-9 h-9 rounded-full bg-accent-100 text-accent-700 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H9l-4 4v-4H6a2 2 0 01-2-2V6z" />
          </svg>
        </div>
        <span className="text-[11px] text-stone-400 [writing-mode:vertical-rl] tracking-wide">AI Matchmaker</span>
      </div>
    );
  }

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-[380px] max-w-[calc(100vw-2rem)] bg-white border-l border-stone-200 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-stone-100 shrink-0">
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
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </div>
      </div>

      <div ref={transcriptRef} className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-accent-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm"
                : "mr-auto max-w-[85%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed"
            }
          >
            {renderMessageContent(m.content)}
          </div>
        ))}
        {sending && <div className="mr-auto text-xs text-stone-400 italic px-1">Thinking…</div>}
        {!sending && quickReplyOptions && (
          <div className="mr-auto max-w-[85%] flex flex-wrap gap-2">
            {quickReplyOptions.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => send(option)}
                className="text-sm font-medium border border-accent-300 bg-accent-50 text-accent-700 rounded-full px-3.5 py-1.5 hover:bg-accent-100 hover:border-accent-400"
              >
                {option}
              </button>
            ))}
          </div>
        )}
        {!sending && suggestedCategory && (
          <div className="mr-auto max-w-[85%]">
            <button
              type="button"
              onClick={() => startCategory(suggestedCategory.key)}
              className="text-sm font-medium border border-accent-300 bg-accent-50 text-accent-700 rounded-full px-3.5 py-1.5 hover:bg-accent-100 hover:border-accent-400"
            >
              Fill in {suggestedCategory.label}
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          send(text);
        }}
        className="border-t border-stone-100 p-3 flex items-end gap-2 shrink-0"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Message your AI Matchmaker…"
          className="flex-1 min-w-0 text-sm bg-stone-100 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
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
