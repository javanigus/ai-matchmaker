"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "closed" | "menu" | "report" | "reportSubmitted" | "confirmBlock";

const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "fake", label: "Fake profile" },
  { value: "photos", label: "Inappropriate photos" },
  { value: "harassment", label: "Harassment or abuse" },
  { value: "spam", label: "Spam or scam" },
  { value: "other", label: "Something else" },
];

// Same skeleton as messages/[matchId]/thread-client.tsx's existing
// "•••" Unmatch menu: one mode-state driving an absolutely-positioned
// panel, Cancel + red destructive confirm, "-ing…" busy labels, plain
// direct supabase.from(...).insert() calls (no API route needed for
// simple owned-row writes).
export default function ReportBlockMenu({
  userId,
  targetUserId,
  targetUserName,
  onBlocked,
}: {
  userId: string;
  targetUserId: string;
  targetUserName: string;
  onBlocked?: () => void;
}) {
  const [mode, setMode] = useState<Mode>("closed");
  const [reason, setReason] = useState("fake");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  function close() {
    setMode("closed");
    setError("");
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: reportError } = await supabase
      .from("reports")
      .insert({ reporter_id: userId, reported_id: targetUserId, reason, details: details.trim() || null });
    setBusy(false);
    if (reportError) {
      setError("Couldn't submit that report — try again.");
      return;
    }
    setDetails("");
    setReason("fake");
    setMode("reportSubmitted");
  }

  async function confirmBlock() {
    setBusy(true);
    setError("");
    const supabase = createClient();
    const { error: blockError } = await supabase.from("blocks").insert({ blocker_id: userId, blocked_id: targetUserId });
    setBusy(false);
    if (blockError) {
      setError("Couldn't block — try again.");
      return;
    }
    setMode("closed");
    onBlocked?.();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setMode((m) => (m === "closed" ? "menu" : "closed"))}
        className="p-1.5 rounded-full bg-white/90 text-stone-500 hover:bg-white hover:text-stone-700"
        aria-label="More options"
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {mode === "menu" && (
        <div className="absolute right-0 top-8 w-48 bg-white border border-stone-200 rounded-xl shadow-lg py-1.5 z-20 text-left">
          <button type="button" onClick={() => setMode("report")} className="w-full text-left text-sm text-stone-700 px-3.5 py-2 hover:bg-stone-50">
            Report
          </button>
          <button type="button" onClick={() => setMode("confirmBlock")} className="w-full text-left text-sm text-red-600 px-3.5 py-2 hover:bg-stone-50">
            Block
          </button>
        </div>
      )}

      {mode === "report" && (
        <form onSubmit={submitReport} className="absolute right-0 top-8 w-72 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 text-left">
          <p className="text-sm font-medium text-stone-900 mb-2">Report {targetUserName}</p>
          <p className="text-xs text-stone-500 mb-3">Your report is anonymous. Our team reviews every report.</p>
          <div className="space-y-1.5 mb-3">
            {REPORT_REASONS.map((r) => (
              <label key={r.value} className="flex items-center gap-2 text-sm text-stone-700">
                <input type="radio" name="reason" value={r.value} checked={reason === r.value} onChange={() => setReason(r.value)} />
                {r.label}
              </label>
            ))}
          </div>
          <textarea
            value={details}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="Optional: add details"
            rows={2}
            className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 mb-3 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
          {error && <p className="text-xs text-red-700 mb-2">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={close} className="text-xs font-medium text-stone-500 hover:underline">
              Cancel
            </button>
            <button type="submit" disabled={busy} className="text-xs font-medium bg-accent-600 text-white rounded-full px-3 py-1.5 hover:bg-accent-700 disabled:opacity-50">
              {busy ? "Submitting…" : "Submit report"}
            </button>
          </div>
        </form>
      )}

      {mode === "reportSubmitted" && (
        <div className="absolute right-0 top-8 w-64 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 text-left">
          <p className="text-sm text-stone-700 mb-3">Thanks — your report has been submitted.</p>
          <button type="button" onClick={close} className="text-xs font-medium text-accent-700 hover:underline">
            Close
          </button>
        </div>
      )}

      {mode === "confirmBlock" && (
        <div className="absolute right-0 top-8 w-72 bg-white border border-stone-200 rounded-xl shadow-lg p-4 z-20 text-left">
          <p className="text-sm font-medium text-stone-900 mb-1">Block {targetUserName}?</p>
          <p className="text-sm text-stone-600 mb-3">
            You won&apos;t see each other in Search, Recommendations, or Matches, and they won&apos;t be notified.
          </p>
          {error && <p className="text-xs text-red-700 mb-2">{error}</p>}
          <div className="flex items-center justify-end gap-3">
            <button type="button" onClick={close} className="text-xs font-medium text-stone-500 hover:underline">
              Cancel
            </button>
            <button
              type="button"
              onClick={confirmBlock}
              disabled={busy}
              className="text-xs font-medium bg-red-600 text-white rounded-full px-3 py-1.5 hover:bg-red-700 disabled:opacity-50"
            >
              {busy ? "Blocking…" : "Block"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
