"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Category } from "@/lib/categories";

export type CategoryCardState = {
  category: Category;
  aiSummary: string | null;
  fullSummary: string | null;
  // Confidence still exists and still drives real mechanics (baseline
  // completion, quick-fact/publish gating, AI Profile Coach's gap
  // detection) — per founder decision, it's just no longer displayed as
  // a raw badge here. An unexplained "Confidence: Medium" next to your
  // own bio read as an arbitrary AI judgment with no case made for it;
  // Compatibility Reports keep the same High/Medium/Low language but
  // always pair it with a written explanation, which is what makes
  // honest uncertainty read as a feature instead of a shrug.
  confidence: string | null;
  visible: boolean;
  pendingSummary: string | null;
  pendingConfidence: string | null;
  quickFact: string | null;
};

export default function CategoryCard({
  userId,
  label,
  quickFactOptions,
  initial,
  onShowFullSummary,
}: {
  userId: string;
  label: string;
  quickFactOptions?: readonly string[];
  initial: CategoryCardState;
  onShowFullSummary: (label: string, text: string) => void;
}) {
  const [state, setState] = useState(initial);
  const [editingApproved, setEditingApproved] = useState(false);
  const [approvedDraft, setApprovedDraft] = useState(state.aiSummary ?? "");
  const [editingPending, setEditingPending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(state.pendingSummary ?? "");
  const [addingFresh, setAddingFresh] = useState(false);
  const [freshDraft, setFreshDraft] = useState("");

  const supabase = createClient();
  const update = (patch: Record<string, unknown>) =>
    supabase.from("profile_categories").update(patch).eq("user_id", userId).eq("category", state.category);

  // A category the AI hasn't touched yet has no row at all, unlike every
  // other write in this component — those only ever run once aiSummary/
  // pendingSummary/quickFact/fullSummary is already non-null, which only
  // happens once a row exists. This is the one write that can be the
  // first ever for the row, so it upserts instead of updating.
  async function saveFresh() {
    const text = freshDraft.trim();
    if (!text) return;
    await supabase
      .from("profile_categories")
      .upsert({ user_id: userId, category: state.category, ai_summary: text }, { onConflict: "user_id,category" });
    setState((s) => ({ ...s, aiSummary: text }));
    setAddingFresh(false);
  }

  // Nothing has ever been learned here yet — matches prototype's dashed
  // "Not learned yet" empty-state card. A category counts as having
  // something to show the moment either an approved OR a pending
  // summary exists — pending-only is the normal state right after
  // onboarding, since Phase 2 only ever writes pending_*, never
  // ai_summary/confidence directly (see chat route's upsert).
  // A real bug caught via founder browser testing: this used to check
  // only aiSummary/pendingSummary, so dismissing a category's very first
  // (never-approved) pending draft made the whole card collapse back to
  // this empty state — silently hiding a quick_fact the user had just
  // picked, even though it was still sitting in the database untouched.
  // A category counts as having something to show if any of its fields
  // do, independent of whether the narrative draft was kept or not.
  if (!state.aiSummary && !state.pendingSummary && !state.quickFact && !state.fullSummary) {
    return (
      <div id={state.category} className="bg-white border border-dashed border-stone-300 rounded-2xl px-5 py-4 scroll-mt-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-500">{label}</h3>
            <p className="text-sm text-stone-400 mt-1 italic leading-relaxed">
              Not learned yet — this hasn&apos;t come up in conversation.
            </p>
          </div>
          {!addingFresh && (
            <button
              type="button"
              onClick={() => setAddingFresh(true)}
              className="shrink-0 text-xs font-medium text-accent-700 hover:underline"
            >
              Add
            </button>
          )}
        </div>
        {addingFresh && (
          <div className="mt-3">
            <textarea
              rows={3}
              autoFocus
              value={freshDraft}
              onChange={(e) => setFreshDraft(e.target.value)}
              placeholder="Write this one yourself — you can always update it later, or your AI Matchmaker will pick up on it in conversation."
              className="w-full text-sm text-stone-900 border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-300"
            />
            <div className="flex items-center gap-3 mt-2">
              <button
                type="button"
                onClick={() => {
                  setAddingFresh(false);
                  setFreshDraft("");
                }}
                className="text-xs font-medium text-stone-500 hover:underline"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveFresh}
                disabled={!freshDraft.trim()}
                className="text-xs font-medium text-accent-700 hover:underline disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  async function toggleVisible() {
    const next = !state.visible;
    setState((s) => ({ ...s, visible: next }));
    await update({ visible: next });
  }

  async function saveQuickFact(value: string) {
    setState((s) => ({ ...s, quickFact: value }));
    await update({ quick_fact: value });
  }

  async function saveApprovedEdit() {
    const text = approvedDraft.trim();
    if (!text) return;
    setState((s) => ({ ...s, aiSummary: text }));
    setEditingApproved(false);
    await update({ ai_summary: text });
  }

  async function approvePending(text: string) {
    const confidence = state.pendingConfidence;
    setState((s) => ({
      ...s,
      aiSummary: text,
      confidence,
      pendingSummary: null,
      pendingConfidence: null,
    }));
    setEditingPending(false);
    await update({
      ai_summary: text,
      confidence,
      pending_summary: null,
      pending_confidence: null,
      pending_source_event_id: null,
    });
  }

  async function keepCurrentText() {
    setState((s) => ({ ...s, pendingSummary: null, pendingConfidence: null }));
    await update({ pending_summary: null, pending_confidence: null, pending_source_event_id: null });
  }

  return (
    <div id={state.category} className="bg-white border border-stone-200 rounded-2xl px-5 py-4 scroll-mt-6">
      <div className="flex items-center justify-between gap-3 mb-2">
        <h3 className="text-sm font-semibold text-stone-800">{label}</h3>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-stone-400">Visible</span>
          <button
            type="button"
            onClick={toggleVisible}
            aria-label={`Visible: ${label}`}
            className={`relative w-9 h-5 rounded-full transition ${state.visible ? "bg-accent-600" : "bg-stone-200"}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${
                state.visible ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      </div>

      {quickFactOptions && (
        <div className="flex items-center flex-wrap gap-2 mb-2">
          <label className="text-[11px] text-stone-400">{label}</label>
          <select
            value={state.quickFact ?? ""}
            onChange={(e) => saveQuickFact(e.target.value)}
            className="text-xs font-medium border border-stone-200 rounded-full pl-2.5 pr-6 py-1 bg-stone-50 text-stone-700 focus:outline-none focus:ring-2 focus:ring-accent-300"
          >
            <option value="" disabled>
              Not set…
            </option>
            {/* A stored value outside the canonical list (e.g. a stray AI
                extraction) is shown as-is rather than silently dropped —
                the point of this control is that the user always sees the
                real current value and can correct it, never a value
                quietly swapped out from under them. */}
            {state.quickFact && !quickFactOptions.includes(state.quickFact) && (
              <option value={state.quickFact}>{state.quickFact} (unrecognized — pick the correct one)</option>
            )}
            {quickFactOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      )}

      {state.aiSummary ? (
        editingApproved ? (
          <textarea
            rows={3}
            value={approvedDraft}
            onChange={(e) => setApprovedDraft(e.target.value)}
            className="w-full text-sm text-stone-900 border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        ) : (
          <p className="text-sm text-stone-600 leading-relaxed">{state.aiSummary}</p>
        )
      ) : (
        <p className="text-sm text-stone-400 italic leading-relaxed">
          Still reviewing your first update below — nothing approved yet.
        </p>
      )}

      {state.aiSummary && (
        <div className="flex items-center justify-end mt-2.5">
          <div className="flex items-center gap-3">
            {state.fullSummary && (
              <button
                type="button"
                onClick={() => onShowFullSummary(label, state.fullSummary!)}
                className="text-xs font-medium text-stone-400 hover:text-stone-600 hover:underline"
              >
                See everything I&apos;ve picked up
              </button>
            )}
            {editingApproved ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingApproved(false);
                    setApprovedDraft(state.aiSummary ?? "");
                  }}
                  className="text-xs font-medium text-stone-500 hover:underline"
                >
                  Cancel
                </button>
                <button type="button" onClick={saveApprovedEdit} className="text-xs font-medium text-accent-700 hover:underline">
                  Save
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setApprovedDraft(state.aiSummary ?? "");
                  setEditingApproved(true);
                }}
                className="text-xs font-medium text-accent-700 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        </div>
      )}

      {state.pendingSummary && (
        <div className="mt-3 pt-3 border-t border-dashed border-accent-300">
          <div className="bg-accent-50 rounded-xl px-4 py-3">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-700 mb-2">
              Updated from your conversation
            </div>
            {editingPending ? (
              <textarea
                rows={4}
                value={pendingDraft}
                onChange={(e) => setPendingDraft(e.target.value)}
                className="w-full text-sm text-stone-900 bg-white border border-accent-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-300"
              />
            ) : (
              <p className="text-sm text-stone-700 leading-relaxed">{state.pendingSummary}</p>
            )}
            <div className="flex items-center justify-end mt-2.5">
              {editingPending ? (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingPending(false);
                      setPendingDraft(state.pendingSummary ?? "");
                    }}
                    className="text-xs font-medium text-stone-500 hover:underline"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => approvePending(pendingDraft.trim())}
                    disabled={!pendingDraft.trim()}
                    className="text-xs font-medium bg-accent-600 text-white rounded-full px-3 py-1.5 hover:bg-accent-700 disabled:opacity-50"
                  >
                    Save &amp; approve
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  {/* "Keep current text" only makes sense when there's
                      existing approved text to fall back to — a real bug
                      caught via founder testing showed this exact label
                      on a category's very first draft, with nothing
                      underneath it to actually keep. Same action either
                      way (dismiss the draft), different label. */}
                  <button type="button" onClick={keepCurrentText} className="text-xs font-medium text-stone-500 hover:underline">
                    {state.aiSummary ? "Keep current text" : "Dismiss"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingDraft(state.pendingSummary ?? "");
                      setEditingPending(true);
                    }}
                    className="text-xs font-medium text-accent-700 hover:underline"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => approvePending(state.pendingSummary!)}
                    className="text-xs font-medium bg-accent-600 text-white rounded-full px-3 py-1.5 hover:bg-accent-700"
                  >
                    Approve updated text
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
