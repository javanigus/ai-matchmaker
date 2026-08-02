"use client";

import { useState } from "react";
import Link from "next/link";

type ChatMessage = { role: "user" | "assistant"; content: string };
type ProgressCategory = { category: string; label: string; met: boolean };

const OPENING_MESSAGE =
  "Hi — I'm your AI Matchmaker. No forms here, just a conversation. Tell me a little about what you're looking for, or whatever's on your mind — we'll get there together.";

export default function OnboardingPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([{ role: "assistant", content: OPENING_MESSAGE }]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [progress, setProgress] = useState<{ percent: number; categories: ProgressCategory[] } | null>(null);
  const [sending, setSending] = useState(false);
  const [baselineReached, setBaselineReached] = useState(false);
  const [error, setError] = useState("");

  // Defense in depth, independent of whatever caused a bad read
  // server-side: once a category has been shown as met, it stays shown
  // as met in this UI, even if a later response (bug, transient error,
  // race) reports fewer. The underlying data is the source of truth and
  // categories don't actually regress on their own (see the chat
  // route's confidence-monotonicity guard) — this just makes sure a
  // display glitch can never look like real data loss to the user.
  const [everMetCategories, setEverMetCategories] = useState<Set<string>>(new Set());

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setSending(true);
    setError("");

    try {
      const res = await fetch("/api/onboarding/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: text }),
      });

      if (!res.ok) {
        setError("Something went wrong — try sending that again.");
        setSending(false);
        return;
      }

      const data = await res.json();
      setConversationId(data.conversationId);
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);

      const nextEverMet = new Set(everMetCategories);
      for (const c of data.progress.categories as ProgressCategory[]) {
        if (c.met) nextEverMet.add(c.category);
      }
      const categories = (data.progress.categories as ProgressCategory[]).map((c) => ({
        ...c,
        met: nextEverMet.has(c.category),
      }));

      setEverMetCategories(nextEverMet);
      setProgress({
        percent: Math.round((categories.filter((c) => c.met).length / categories.length) * 100),
        categories,
      });
      if (data.baselineJustReached) setBaselineReached(true);
    } catch {
      setError("Something went wrong — try sending that again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-10 flex flex-col min-h-screen">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">Your AI Matchmaker</h1>
      <p className="text-sm text-stone-500 mb-6">
        Phase 2 scope — real conversation, real extraction. Visual polish deferred.
      </p>

      {progress && (
        <div className="bg-white border border-stone-200 rounded-2xl px-4 py-3 mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-stone-700">Building your Compatibility Profile</span>
            <span className="text-xs text-stone-500">{progress.percent}%</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {progress.categories.map((c) => (
              <span
                key={c.category}
                className={`text-[11px] font-medium rounded-full px-2.5 py-1 ${
                  c.met ? "bg-accent-100 text-accent-700" : "border border-dashed border-stone-300 text-stone-400"
                }`}
              >
                {c.met ? "✓ " : ""}
                {c.label}
              </span>
            ))}
          </div>
        </div>
      )}

      {baselineReached && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-4 flex items-center justify-between">
          <span className="text-sm text-emerald-800">I know you well enough to get started.</span>
          <Link
            href="/profile"
            className="text-xs font-semibold bg-emerald-600 text-white rounded-full px-4 py-2 hover:bg-emerald-700"
          >
            Check out your profile
          </Link>
        </div>
      )}

      <div className="flex-1 space-y-3 mb-4 overflow-y-auto">
        {messages.map((m, i) => (
          <div
            key={i}
            className={
              m.role === "user"
                ? "ml-auto max-w-[85%] bg-accent-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed"
                : "mr-auto max-w-[85%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
        {sending && <div className="mr-auto text-xs text-stone-400 px-2">Thinking…</div>}
      </div>

      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-stone-200 pt-3">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type a message…"
          disabled={sending}
          className="flex-1 min-w-0 text-sm text-stone-900 bg-stone-100 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-full bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50"
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l16-7-6.5 16-3-6.5L4 12z" />
          </svg>
        </button>
      </form>
    </main>
  );
}
