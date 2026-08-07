"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type Decision = "pass" | "like" | null;

export type DecisionActionsInitial = {
  decision: Decision;
  saved: boolean;
};

// Shared Pass/Save/Like/Undo mechanic (docs/prd.md -> "Match Browsing &
// Feedback"), used identically on /recommendations, /search, and
// /saved-profiles — the three surfaces PLAN.md's Phase 7 demo criterion
// names. Presentation (card layout) differs per page and stays local to
// each; this component owns only the decision/save behavior itself, so
// the origin-based feedback rule can't drift into three slightly
// different copies.
//
// requiresFeedback follows prd.md's "Decision feedback rules" literally:
// true only when this candidate came from an AI recommendation
// (recommendationId set) and hasn't had feedback collected for it yet.
// Search-originated decisions, and a saved-then-decided profile that
// originated from Search, are always requiresFeedback=false. When true,
// the feedback textarea is always visible (matching prototype/
// recommendations.html's own design — not a separate reveal-on-click
// step) and Pass/Like stay disabled until real text is entered; Save
// never requires it, per prd.
//
// Real simplification, noted here rather than silently assumed: Undo
// deletes the profile_decisions row outright (the schema has no
// "undecided" value — decision is a NOT NULL check(pass/like) column,
// so no row is the only way to represent undecided). That means
// feedback_given doesn't survive an Undo-then-redecide round trip on
// the same recommendation; a redecide after Undo is treated as fresh.
// prd.md's "later revisits to the same recommendation never ask again"
// most plausibly describes an unchanged, still-existing decision being
// viewed again, not this edge case — but it's a real interpretation
// call, not a certainty, worth flagging rather than silently picking.
export default function DecisionActions({
  userId,
  targetUserId,
  requiresFeedback,
  recommendationId,
  source,
  initial,
  onDecided,
  onSavedChange,
}: {
  userId: string;
  targetUserId: string;
  requiresFeedback: boolean;
  recommendationId: string | null;
  source: "recommendation" | "search";
  initial: DecisionActionsInitial;
  onDecided?: (decision: Decision) => void;
  onSavedChange?: (saved: boolean) => void;
}) {
  const [decision, setDecision] = useState<Decision>(initial.decision);
  const [saved, setSaved] = useState(initial.saved);
  const [feedbackText, setFeedbackText] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [savingBusy, setSavingBusy] = useState(false);
  const [decidingBusy, setDecidingBusy] = useState(false);
  const [error, setError] = useState("");

  const supabase = createClient();
  const needsFeedbackBox = requiresFeedback && !decision;
  const canDecide = !needsFeedbackBox || feedbackText.trim().length > 0;

  async function toggleSave() {
    setSavingBusy(true);
    setError("");
    if (saved) {
      const { error: delError } = await supabase
        .from("saved_profiles")
        .delete()
        .eq("user_id", userId)
        .eq("target_user_id", targetUserId);
      setSavingBusy(false);
      if (delError) {
        setError("Couldn't remove — try again.");
        return;
      }
      setSaved(false);
      onSavedChange?.(false);
    } else {
      const { error: saveError } = await supabase.from("saved_profiles").upsert(
        { user_id: userId, target_user_id: targetUserId, source, recommendation_id: recommendationId },
        { onConflict: "user_id,target_user_id" }
      );
      setSavingBusy(false);
      if (saveError) {
        setError("Couldn't save — try again.");
        return;
      }
      setSaved(true);
      onSavedChange?.(true);
    }
  }

  async function decide(action: "pass" | "like") {
    if (!canDecide || decidingBusy) return;
    setDecidingBusy(true);
    setError("");
    const { error: decideError } = await supabase.from("profile_decisions").upsert(
      {
        user_id: userId,
        target_user_id: targetUserId,
        decision: action,
        recommendation_id: recommendationId,
        feedback_given: requiresFeedback,
        physical_attraction_rating: rating,
        feedback_text: feedbackText.trim() || null,
      },
      { onConflict: "user_id,target_user_id" }
    );
    setDecidingBusy(false);
    if (decideError) {
      setError("Couldn't record that — try again.");
      return;
    }
    setDecision(action);
    onDecided?.(action);
  }

  async function undo() {
    setDecidingBusy(true);
    setError("");
    const { error: undoError } = await supabase
      .from("profile_decisions")
      .delete()
      .eq("user_id", userId)
      .eq("target_user_id", targetUserId);
    setDecidingBusy(false);
    if (undoError) {
      setError("Couldn't undo — try again.");
      return;
    }
    setDecision(null);
    setFeedbackText("");
    setRating(null);
    onDecided?.(null);
  }

  if (decision) {
    return (
      <div className="flex items-center gap-2.5">
        <span
          className={`text-xs font-medium rounded-full px-3 py-1.5 ${
            decision === "like" ? "bg-accent-50 text-accent-700" : "bg-stone-100 text-stone-500"
          }`}
        >
          {decision === "like" ? "Liked" : "Passed"}
        </span>
        <button type="button" onClick={undo} disabled={decidingBusy} className="text-xs font-medium text-stone-400 hover:text-stone-600 disabled:opacity-50">
          Undo
        </button>
        {error && <span className="text-xs text-red-700">{error}</span>}
      </div>
    );
  }

  return (
    <div>
      {needsFeedbackBox && (
        <div className="mb-2.5">
          <label className="text-xs font-medium text-stone-500">
            Tell us briefly why you passed or liked this person. This helps improve future recommendations.
          </label>
          <textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            rows={2}
            placeholder="e.g. Attractive but has kids, too far away, love her travel photos…"
            className="mt-1.5 w-full text-sm bg-white border border-stone-200 rounded-xl px-3 py-2 leading-relaxed focus:outline-none focus:ring-2 focus:ring-accent-300 placeholder:text-stone-400"
          />
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-stone-400">Physically attracted? (optional)</span>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setRating(rating === n ? null : n)}
                aria-label={`${n} out of 5`}
                className={`w-6 h-6 rounded-full text-xs font-medium border ${
                  rating != null && n <= rating ? "bg-accent-600 border-accent-600 text-white" : "border-stone-300 text-stone-400 hover:bg-stone-50"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => decide("pass")}
          disabled={!canDecide || decidingBusy}
          className="text-xs font-medium border border-stone-300 text-stone-600 rounded-full px-3.5 py-1.5 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Pass
        </button>
        <button
          type="button"
          onClick={toggleSave}
          disabled={savingBusy}
          className={`text-xs font-medium rounded-full px-3.5 py-1.5 border disabled:opacity-50 ${
            saved ? "border-accent-300 bg-accent-50 text-accent-700" : "border-stone-300 text-stone-600 hover:bg-stone-50"
          }`}
        >
          {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => decide("like")}
          disabled={!canDecide || decidingBusy}
          className="text-xs font-medium border border-stone-300 text-stone-600 rounded-full px-3.5 py-1.5 hover:bg-stone-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Like
        </button>
      </div>
      {error && <p className="text-xs text-red-700 mt-1.5">{error}</p>}
    </div>
  );
}
