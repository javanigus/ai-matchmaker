"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  QUICK_FACT_OPTIONS,
  DEALBREAKER_GENDER_OPTIONS,
  DEALBREAKER_CHILDREN_OPTIONS,
  DEALBREAKER_EDUCATION_OPTIONS,
} from "@/lib/categories";

export type DealbreakersState = {
  ageMin: number | null;
  ageMax: number | null;
  gender: string;
  children: string;
  educationMin: string;
  religions: string[];
  ethnicities: string[];
  custom: string[];
};

const RELIGION_OPTIONS = QUICK_FACT_OPTIONS.religion_spirituality!;

function summaryChips(d: DealbreakersState): string[] {
  const chips: string[] = [];
  if (d.ageMin != null || d.ageMax != null) {
    chips.push(`Age ${d.ageMin ?? "any"}–${d.ageMax ?? "any"}`);
  }
  if (d.gender) chips.push(`Gender: ${d.gender}`);
  if (d.children) chips.push(d.children);
  if (d.educationMin) chips.push(d.educationMin);
  d.religions.forEach((r) => chips.push(`Religion: ${r}`));
  d.ethnicities.forEach((e) => chips.push(`Ethnicity: ${e}`));
  d.custom.forEach((c) => chips.push(`"${c}"`));
  return chips;
}

export default function DealbreakersSection({ userId, initial }: { userId: string; initial: DealbreakersState }) {
  const [saved, setSaved] = useState(initial);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(initial);
  const [ethnicityInput, setEthnicityInput] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "error">("idle");

  function openModal() {
    setForm(saved);
    setEthnicityInput("");
    setCustomInput("");
    setSaveStatus("idle");
    setOpen(true);
  }

  function toggleReligion(value: string) {
    setForm((f) => ({
      ...f,
      religions: f.religions.includes(value) ? f.religions.filter((r) => r !== value) : [...f.religions, value],
    }));
  }

  function addEthnicity() {
    const value = ethnicityInput.trim();
    if (!value || form.ethnicities.includes(value)) return;
    setForm((f) => ({ ...f, ethnicities: [...f.ethnicities, value] }));
    setEthnicityInput("");
  }

  function removeEthnicity(value: string) {
    setForm((f) => ({ ...f, ethnicities: f.ethnicities.filter((e) => e !== value) }));
  }

  function addCustom() {
    const value = customInput.trim();
    if (!value || form.custom.includes(value)) return;
    setForm((f) => ({ ...f, custom: [...f.custom, value] }));
    setCustomInput("");
  }

  function removeCustom(value: string) {
    setForm((f) => ({ ...f, custom: f.custom.filter((c) => c !== value) }));
  }

  async function handleSave() {
    setSaveStatus("saving");
    const supabase = createClient();

    // Full-replace, same pattern as Basics' ethnicity handling: whatever
    // is in the form when Save is clicked becomes the whole set. Structured
    // attribute names/values here must match published_candidates_for()'s
    // hardcoded literals exactly (supabase/migrations/20260804010000_
    // dealbreaker_filter_function.sql).
    const structuredRows: { user_id: string; attribute: string; value: string }[] = [];
    if (form.ageMin != null) structuredRows.push({ user_id: userId, attribute: "age_min", value: String(form.ageMin) });
    if (form.ageMax != null) structuredRows.push({ user_id: userId, attribute: "age_max", value: String(form.ageMax) });
    if (form.gender) structuredRows.push({ user_id: userId, attribute: "gender", value: form.gender });
    if (form.children) structuredRows.push({ user_id: userId, attribute: "children", value: form.children });
    if (form.educationMin) structuredRows.push({ user_id: userId, attribute: "education_min", value: form.educationMin });
    form.religions.forEach((r) => structuredRows.push({ user_id: userId, attribute: "religion", value: r }));
    form.ethnicities.forEach((e) => structuredRows.push({ user_id: userId, attribute: "ethnicity", value: e }));

    const { error: deleteStructuredError } = await supabase
      .from("dealbreakers_structured")
      .delete()
      .eq("user_id", userId);

    const { error: insertStructuredError } =
      structuredRows.length > 0 ? await supabase.from("dealbreakers_structured").insert(structuredRows) : { error: null };

    const { error: deleteCustomError } = await supabase.from("dealbreakers_custom").delete().eq("user_id", userId);

    const { error: insertCustomError } =
      form.custom.length > 0
        ? await supabase.from("dealbreakers_custom").insert(form.custom.map((text) => ({ user_id: userId, text })))
        : { error: null };

    if (deleteStructuredError || insertStructuredError || deleteCustomError || insertCustomError) {
      setSaveStatus("error");
      return;
    }

    setSaved(form);
    setSaveStatus("idle");
    setOpen(false);
  }

  const chips = summaryChips(saved);

  return (
    <section className="mb-10">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-400 mb-3">
        Dealbreakers <span className="text-stone-300 normal-case font-normal">— private</span>
      </h2>
      <div className="bg-white border border-stone-200 rounded-2xl px-5 py-4">
        <p className="text-xs text-stone-400 mb-3 leading-relaxed">
          Hard requirements, not preferences — set directly, not through conversation, since there&apos;s nothing
          ambiguous here for your AI Matchmaker to interpret. Someone who doesn&apos;t meet these is filtered out
          automatically and never notified. Never shown on your public profile.
        </p>
        {chips.length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-3">
            {chips.map((chip, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 text-xs font-medium bg-stone-100 text-stone-700 rounded-full px-3 py-1.5"
              >
                {chip}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-stone-400 italic mb-3">No dealbreakers set yet.</p>
        )}
        <button type="button" onClick={openModal} className="text-xs font-medium text-accent-700 hover:underline">
          Edit dealbreakers
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-[70] bg-stone-950/50 flex items-center justify-center p-4">
          <div className="absolute inset-0" onClick={() => setOpen(false)} />
          <div className="relative z-10 w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 max-h-[85vh] overflow-y-auto">
            <h2 className="font-serif text-lg text-stone-900 mb-1">Dealbreakers</h2>
            <p className="text-sm text-stone-500 mb-5">
              Structured requirements are set directly here, not through conversation — there&apos;s nothing ambiguous
              for your AI Matchmaker to interpret. Anyone who doesn&apos;t meet them is filtered out automatically and
              never told why.
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Age range</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={form.ageMin ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, ageMin: e.target.value ? Number(e.target.value) : null }))}
                    className="w-20 text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
                  />
                  <span className="text-sm text-stone-400">to</span>
                  <input
                    type="number"
                    min={18}
                    max={99}
                    value={form.ageMax ?? ""}
                    onChange={(e) => setForm((f) => ({ ...f, ageMax: e.target.value ? Number(e.target.value) : null }))}
                    className="w-20 text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Gender</label>
                <select
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
                >
                  <option value="">No preference</option>
                  {DEALBREAKER_GENDER_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Distance</label>
                <select
                  disabled
                  className="w-full text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 bg-stone-50 text-stone-400 cursor-not-allowed"
                >
                  <option>No preference</option>
                </select>
                <p className="text-[11px] text-stone-400 mt-1">
                  Not available yet — we only store city/state right now, not precise location. Coming later.
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Religion</label>
                <p className="text-[11px] text-stone-400 mb-1.5">
                  Check any that would be acceptable — one, several, or none for no preference.
                </p>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
                  {RELIGION_OPTIONS.map((opt) => (
                    <label key={opt} className="flex items-center gap-2 text-sm text-stone-700">
                      <input
                        type="checkbox"
                        checked={form.religions.includes(opt)}
                        onChange={() => toggleReligion(opt)}
                        className="rounded border-stone-300 text-accent-600 focus:ring-accent-400"
                      />
                      {opt}
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Ethnicity / cultural background</label>
                <p className="text-[11px] text-stone-400 mb-1.5">
                  Add any specific nationality or background that would be required. Leave empty for no preference.
                </p>
                <div className="flex flex-wrap gap-2 mb-2">
                  {form.ethnicities.map((e) => (
                    <span
                      key={e}
                      className="inline-flex items-center gap-1.5 text-sm bg-stone-100 text-stone-700 rounded-full px-3 py-1.5"
                    >
                      {e}
                      <button
                        type="button"
                        onClick={() => removeEthnicity(e)}
                        className="text-stone-400 hover:text-red-600"
                        aria-label={`Remove ${e}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ethnicityInput}
                    onChange={(e) => setEthnicityInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addEthnicity();
                      }
                    }}
                    placeholder="e.g. Afghan…"
                    className="flex-1 min-w-0 text-sm border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
                  />
                  <button
                    type="button"
                    onClick={addEthnicity}
                    className="text-xs font-medium border border-stone-300 text-stone-600 rounded-full px-3 py-1.5 hover:bg-stone-50"
                  >
                    Add
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Children</label>
                <select
                  value={form.children}
                  onChange={(e) => setForm((f) => ({ ...f, children: e.target.value }))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
                >
                  <option value="">No preference</option>
                  {DEALBREAKER_CHILDREN_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-stone-500 block mb-1">Education level</label>
                <select
                  value={form.educationMin}
                  onChange={(e) => setForm((f) => ({ ...f, educationMin: e.target.value }))}
                  className="w-full text-sm border border-stone-300 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-300"
                >
                  <option value="">No preference</option>
                  {DEALBREAKER_EDUCATION_OPTIONS.map((opt) => (
                    <option key={opt}>{opt}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border-t border-stone-100 pt-4 mb-5">
              <label className="text-xs font-medium text-stone-500 block mb-2">Custom dealbreakers</label>
              <p className="text-[11px] text-stone-400 mb-2 leading-relaxed">
                Anything else specific to you. Your AI Matchmaker weighs these heavily when reasoning about a match,
                but — unlike the fields above — they can&apos;t be guaranteed the way a structured filter can.
              </p>
              <div className="space-y-2 mb-2">
                {form.custom.map((c) => (
                  <div key={c} className="flex items-center justify-between bg-stone-50 rounded-lg px-3 py-2">
                    <span className="text-sm text-stone-700">{c}</span>
                    <button
                      type="button"
                      onClick={() => removeCustom(c)}
                      className="text-stone-400 hover:text-red-600"
                      aria-label="Remove"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCustom();
                    }
                  }}
                  placeholder="Add a custom dealbreaker…"
                  className="flex-1 min-w-0 text-sm border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
                />
                <button
                  type="button"
                  onClick={addCustom}
                  className="text-xs font-medium border border-stone-300 text-stone-600 rounded-full px-3 py-1.5 hover:bg-stone-50"
                >
                  Add
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              {saveStatus === "error" && <span className="text-xs text-red-700 mr-auto">Save failed. Try again.</span>}
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-stone-500 px-4 py-2 rounded-full hover:bg-stone-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={saveStatus === "saving"}
                className="text-sm font-medium bg-accent-600 text-white px-4 py-2 rounded-full hover:bg-accent-700 disabled:opacity-50"
              >
                {saveStatus === "saving" ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
