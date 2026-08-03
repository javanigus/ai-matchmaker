"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export type ProfileTextState = {
  profileText: string | null;
  pendingProfileText: string | null;
};

// Mirrors category-card.tsx's Approve/Edit/Dismiss pattern, but simpler
// and separate rather than forced into CategoryCard: this isn't one of
// the 12 tracked categories (no confidence, no quick_fact, no Visibility
// toggle — always public, same as Basics) and it lives on users, not
// profile_categories.
export default function ProfileTextCard({ userId, initial }: { userId: string; initial: ProfileTextState }) {
  const [state, setState] = useState(initial);
  const [editingApproved, setEditingApproved] = useState(false);
  const [approvedDraft, setApprovedDraft] = useState(state.profileText ?? "");
  const [editingPending, setEditingPending] = useState(false);
  const [pendingDraft, setPendingDraft] = useState(state.pendingProfileText ?? "");
  const [addingFresh, setAddingFresh] = useState(false);
  const [freshDraft, setFreshDraft] = useState("");

  const supabase = createClient();
  const update = (patch: Record<string, unknown>) => supabase.from("users").update(patch).eq("id", userId);

  if (!state.profileText && !state.pendingProfileText) {
    return (
      <section className="mb-8">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400 mb-3">Profile Text</h2>
        <div className="bg-white border border-dashed border-stone-300 rounded-2xl px-5 py-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-stone-400 italic leading-relaxed">
              Not written yet — your AI Matchmaker will propose one once you&apos;ve talked a bit, or write your own now.
            </p>
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
                placeholder="Write your own headline intro…"
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
                  onClick={async () => {
                    const text = freshDraft.trim();
                    if (!text) return;
                    await update({ profile_text: text });
                    setState((s) => ({ ...s, profileText: text }));
                    setAddingFresh(false);
                  }}
                  disabled={!freshDraft.trim()}
                  className="text-xs font-medium text-accent-700 hover:underline disabled:opacity-50"
                >
                  Save
                </button>
              </div>
            </div>
          )}
        </div>
      </section>
    );
  }

  async function saveApprovedEdit() {
    const text = approvedDraft.trim();
    if (!text) return;
    setState((s) => ({ ...s, profileText: text }));
    setEditingApproved(false);
    await update({ profile_text: text });
  }

  async function approvePending(text: string) {
    setState({ profileText: text, pendingProfileText: null });
    setEditingPending(false);
    await update({ profile_text: text, pending_profile_text: null });
  }

  async function keepCurrentText() {
    setState((s) => ({ ...s, pendingProfileText: null }));
    await update({ pending_profile_text: null });
  }

  return (
    <section className="mb-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400 mb-3">
        Profile Text <span className="text-stone-300 normal-case font-normal">— always public</span>
      </h2>
      <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
        {state.profileText ? (
          editingApproved ? (
            <textarea
              rows={3}
              value={approvedDraft}
              onChange={(e) => setApprovedDraft(e.target.value)}
              className="w-full text-sm text-stone-900 border border-stone-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-300"
            />
          ) : (
            <p className="text-sm text-stone-600 leading-relaxed">{state.profileText}</p>
          )
        ) : (
          <p className="text-sm text-stone-400 italic leading-relaxed">
            Still reviewing your first proposal below — nothing approved yet.
          </p>
        )}

        {state.profileText && (
          <div className="flex items-center justify-end mt-2.5">
            {editingApproved ? (
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setEditingApproved(false);
                    setApprovedDraft(state.profileText ?? "");
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
                  setApprovedDraft(state.profileText ?? "");
                  setEditingApproved(true);
                }}
                className="text-xs font-medium text-accent-700 hover:underline"
              >
                Edit
              </button>
            )}
          </div>
        )}

        {state.pendingProfileText && (
          <div className="mt-3 pt-3 border-t border-dashed border-accent-300">
            <div className="bg-accent-50 rounded-xl px-4 py-3">
              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-accent-700 mb-2">
                Proposed from your conversation
              </div>
              {editingPending ? (
                <textarea
                  rows={4}
                  value={pendingDraft}
                  onChange={(e) => setPendingDraft(e.target.value)}
                  className="w-full text-sm text-stone-900 bg-white border border-accent-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent-300"
                />
              ) : (
                <p className="text-sm text-stone-700 leading-relaxed">{state.pendingProfileText}</p>
              )}
              <div className="flex items-center justify-end mt-2.5">
                {editingPending ? (
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setEditingPending(false);
                        setPendingDraft(state.pendingProfileText ?? "");
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
                    <button type="button" onClick={keepCurrentText} className="text-xs font-medium text-stone-500 hover:underline">
                      {state.profileText ? "Keep current text" : "Dismiss"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setPendingDraft(state.pendingProfileText ?? "");
                        setEditingPending(true);
                      }}
                      className="text-xs font-medium text-accent-700 hover:underline"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => approvePending(state.pendingProfileText!)}
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
    </section>
  );
}
