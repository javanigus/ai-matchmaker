"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

type Message = { id: string; sender_id: string; content: string; created_at: string };

type MenuMode = "closed" | "menu" | "report" | "confirmBlock" | "confirmUnmatch";

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "fake", label: "Fake profile" },
  { value: "photos", label: "Inappropriate photos" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam or scam" },
  { value: "other", label: "Something else" },
];

// Real scope cut, disclosed rather than silently assumed: no
// websocket/Supabase Realtime subscription here — sending a message
// updates the sender's own view immediately, but the other person only
// sees it via this poll (every POLL_MS) rather than instantly. Matches
// this app's existing "no infra beyond what's proven necessary"
// pattern (the AI Matchmaker chat itself isn't real-time either) and
// keeps this verifiable the same way the rest of this app's real-time-
// ish features are — a real script hitting a real query, not something
// that needs a live two-browser test to prove works at all.
const POLL_MS = 5000;

export default function ThreadClient({
  userId,
  matchId,
  otherUserId,
  otherUserName,
  initialMessages,
}: {
  userId: string;
  matchId: string;
  otherUserId: string;
  otherUserName: string;
  initialMessages: Message[];
}) {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [menuMode, setMenuMode] = useState<MenuMode>("closed");
  const [unmatching, setUnmatching] = useState(false);
  const [reportReason, setReportReason] = useState("fake");
  const [reportDetails, setReportDetails] = useState("");
  const [reportBusy, setReportBusy] = useState(false);
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [blocking, setBlocking] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const lastCreatedAtRef = useRef<string | null>(initialMessages.at(-1)?.created_at ?? null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const supabase = createClient();
    const interval = setInterval(async () => {
      const query = supabase.from("match_messages").select("id, sender_id, content, created_at").eq("match_id", matchId).order("created_at", { ascending: true });
      const { data } = lastCreatedAtRef.current ? await query.gt("created_at", lastCreatedAtRef.current) : await query;
      if (data && data.length > 0) {
        setMessages((m) => [...m, ...data]);
        lastCreatedAtRef.current = data.at(-1)!.created_at;
      }
    }, POLL_MS);
    return () => clearInterval(interval);
  }, [matchId]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError("");
    setInput("");

    const supabase = createClient();
    const { data, error: sendError } = await supabase
      .from("match_messages")
      .insert({ match_id: matchId, sender_id: userId, content: text })
      .select("id, sender_id, content, created_at")
      .single();
    setSending(false);

    if (sendError || !data) {
      setError("Couldn't send — try again.");
      setInput(text);
      return;
    }
    setMessages((m) => [...m, data]);
    lastCreatedAtRef.current = data.created_at;
  }

  async function unmatch() {
    setUnmatching(true);
    const supabase = createClient();
    const { error: unmatchError } = await supabase.from("matches").delete().eq("id", matchId);
    setUnmatching(false);
    if (unmatchError) {
      setError("Couldn't unmatch — try again.");
      return;
    }
    router.push("/matches");
    router.refresh();
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setReportBusy(true);
    setError("");
    const supabase = createClient();
    const { error: reportError } = await supabase
      .from("reports")
      .insert({ reporter_id: userId, reported_id: otherUserId, reason: reportReason, details: reportDetails.trim() || null });
    setReportBusy(false);
    if (reportError) {
      setError("Couldn't submit that report — try again.");
      return;
    }
    setReportDetails("");
    setReportReason("fake");
    setReportSubmitted(true);
  }

  async function confirmBlock() {
    setBlocking(true);
    const supabase = createClient();
    const { error: blockError } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: otherUserId });
    setBlocking(false);
    if (blockError) {
      setError("Couldn't block — try again.");
      return;
    }
    router.push("/messages");
    router.refresh();
  }

  return (
    <main className="max-w-2xl mx-auto px-6 py-8 flex flex-col" style={{ minHeight: "calc(100vh - 4rem)" }}>
      <div className="flex items-center gap-3 pb-4 border-b border-stone-200">
        <div className="w-11 h-11 rounded-full bg-gradient-to-br from-accent-200 to-accent-400 flex items-center justify-center shrink-0">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 text-white/70">
            <circle cx="12" cy="8" r="4" />
            <path d="M4 20c1.5-4.5 5-6.5 8-6.5s6.5 2 8 6.5" />
          </svg>
        </div>
        <p className="font-medium text-stone-900 min-w-0 flex-1">{otherUserName}</p>
        <Link href={`/compatibility/${otherUserId}`} className="shrink-0 text-sm text-accent-700 hover:underline">
          View compatibility
        </Link>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuMode((m) => (m === "closed" ? "menu" : "closed"))}
            className="p-1.5 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600"
            aria-label="More options"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
              <circle cx="12" cy="5" r="1.5" />
              <circle cx="12" cy="12" r="1.5" />
              <circle cx="12" cy="19" r="1.5" />
            </svg>
          </button>

          {menuMode === "menu" && (
            <div className="absolute right-0 top-9 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-20 text-left">
              <button type="button" onClick={() => setMenuMode("report")} className="w-full text-left text-sm text-stone-700 px-3.5 py-2 hover:bg-stone-50">
                Report
              </button>
              <button type="button" onClick={() => setMenuMode("confirmBlock")} className="w-full text-left text-sm text-red-600 px-3.5 py-2 hover:bg-stone-50">
                Block
              </button>
              <button type="button" onClick={() => setMenuMode("confirmUnmatch")} className="w-full text-left text-sm text-red-600 px-3.5 py-2 hover:bg-stone-50">
                Unmatch
              </button>
            </div>
          )}

          {menuMode === "report" && !reportSubmitted && (
            <form onSubmit={submitReport} className="absolute right-0 top-9 w-72 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 text-left">
              <p className="text-sm font-medium text-stone-900 mb-2">Report {otherUserName}</p>
              <p className="text-xs text-stone-500 mb-3">Your report is anonymous. Our team reviews every report.</p>
              <div className="space-y-1.5 mb-3">
                {REPORT_REASONS.map((r) => (
                  <label key={r.value} className="flex items-center gap-2 text-sm text-stone-700">
                    <input type="radio" name="reason" value={r.value} checked={reportReason === r.value} onChange={() => setReportReason(r.value)} />
                    {r.label}
                  </label>
                ))}
              </div>
              <textarea
                value={reportDetails}
                onChange={(e) => setReportDetails(e.target.value)}
                placeholder="Optional: add details"
                rows={2}
                className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 mb-3 focus:outline-none focus:ring-2 focus:ring-accent-300"
              />
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setMenuMode("closed")} className="text-xs font-medium text-stone-500 hover:underline">
                  Cancel
                </button>
                <button type="submit" disabled={reportBusy} className="text-xs font-medium bg-accent-600 text-white rounded-full px-3 py-1.5 hover:bg-accent-700 disabled:opacity-50">
                  {reportBusy ? "Submitting…" : "Submit report"}
                </button>
              </div>
            </form>
          )}

          {menuMode === "report" && reportSubmitted && (
            <div className="absolute right-0 top-9 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 text-left">
              <p className="text-sm text-stone-700 mb-3">Thanks — your report has been submitted.</p>
              <button
                type="button"
                onClick={() => {
                  setMenuMode("closed");
                  setReportSubmitted(false);
                }}
                className="text-xs font-medium text-accent-700 hover:underline"
              >
                Close
              </button>
            </div>
          )}

          {menuMode === "confirmBlock" && (
            <div className="absolute right-0 top-9 w-72 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 text-left">
              <p className="text-sm font-medium text-stone-900 mb-1">Block {otherUserName}?</p>
              <p className="text-sm text-stone-600 mb-3">
                You won&apos;t see each other in Search, Recommendations, or Matches, and they won&apos;t be notified.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setMenuMode("closed")} className="text-xs font-medium text-stone-500 hover:underline">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmBlock}
                  disabled={blocking}
                  className="text-xs font-medium bg-red-600 text-white rounded-full px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                >
                  {blocking ? "Blocking…" : "Block"}
                </button>
              </div>
            </div>
          )}

          {menuMode === "confirmUnmatch" && (
            <div className="absolute right-0 top-9 w-72 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20">
              <p className="text-sm text-stone-700 mb-3">
                This will delete your conversation with {otherUserName} for both of you. This can&apos;t be undone.
              </p>
              <div className="flex items-center justify-end gap-3">
                <button type="button" onClick={() => setMenuMode("closed")} className="text-xs font-medium text-stone-500 hover:underline">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={unmatch}
                  disabled={unmatching}
                  className="text-xs font-medium bg-red-600 text-white rounded-full px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
                >
                  {unmatching ? "Unmatching…" : "Unmatch"}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-4 space-y-3">
        {messages.length === 0 && <p className="text-sm text-stone-400 text-center py-10">Say hello — this is the start of your conversation.</p>}
        {messages.map((m) => (
          <div
            key={m.id}
            className={
              m.sender_id === userId
                ? "ml-auto max-w-[85%] bg-accent-600 text-white rounded-2xl rounded-br-md px-4 py-2.5 text-sm leading-relaxed"
                : "mr-auto max-w-[85%] bg-stone-100 text-stone-800 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && <p className="text-xs text-red-700 mb-2">{error}</p>}

      <form onSubmit={send} className="flex items-center gap-2 pt-3 border-t border-stone-200">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={`Message ${otherUserName}…`}
          className="flex-1 min-w-0 text-sm bg-stone-100 rounded-full px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="p-2.5 rounded-full bg-accent-600 text-white hover:bg-accent-700 disabled:opacity-50 shrink-0"
          aria-label="Send"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 12l16-7-6.5 16-3-6.5L4 12z" />
          </svg>
        </button>
      </form>
    </main>
  );
}
