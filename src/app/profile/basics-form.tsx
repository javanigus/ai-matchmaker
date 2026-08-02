"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Basics = {
  age: number | null;
  gender: string;
  locationCity: string;
  locationState: string;
  locationCountry: string;
  occupation: string;
  ethnicities: string[];
  publishedAt: string | null;
};

const REQUIRED_FIELD_LABELS: Record<string, string> = {
  age: "Age",
  gender: "Gender",
  locationCity: "City",
  locationState: "State",
  locationCountry: "Country",
  occupation: "Occupation",
  ethnicities: "Ethnicity",
};

export default function BasicsForm({
  userId,
  initial,
}: {
  userId: string;
  initial: Basics;
}) {
  const [form, setForm] = useState(initial);
  const [ethnicityInput, setEthnicityInput] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [publishStatus, setPublishStatus] = useState<"idle" | "publishing" | "error">("idle");
  const [publishError, setPublishError] = useState<string[]>([]);
  const [published, setPublished] = useState(!!initial.publishedAt);

  // The "missing: X, Y" message otherwise only updates on the next
  // Publish click — clear it as soon as the form changes so it can't
  // sit there stale after the user's already fixed what it complained
  // about (real bug, caught via a founder screenshot: filled in the
  // missing fields, clicked Save instead of Publish again, and the old
  // error just stayed on screen looking like the data was still bad).
  useEffect(() => {
    setPublishStatus("idle");
    setPublishError([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form]);

  function addEthnicity() {
    const value = ethnicityInput.trim();
    if (!value || form.ethnicities.includes(value)) return;
    setForm((f) => ({ ...f, ethnicities: [...f.ethnicities, value] }));
    setEthnicityInput("");
  }

  function removeEthnicity(value: string) {
    setForm((f) => ({ ...f, ethnicities: f.ethnicities.filter((e) => e !== value) }));
  }

  async function handleSave() {
    setSaveStatus("saving");
    const supabase = createClient();

    const { error: userError } = await supabase
      .from("users")
      .update({
        age: form.age,
        gender: form.gender || null,
        location_city: form.locationCity || null,
        location_state: form.locationState || null,
        location_country: form.locationCountry || null,
        occupation: form.occupation || null,
      })
      .eq("id", userId);

    // Full-replace, matching the mockup's Basics modal: whatever tags
    // are in the form when Save is clicked become the whole set.
    const { error: deleteError } = await supabase
      .from("user_ethnicities")
      .delete()
      .eq("user_id", userId);

    const { error: insertError } =
      form.ethnicities.length > 0
        ? await supabase
            .from("user_ethnicities")
            .insert(form.ethnicities.map((ethnicity) => ({ user_id: userId, ethnicity })))
        : { error: null };

    if (userError || deleteError || insertError) {
      setSaveStatus("error");
      return;
    }
    setSaveStatus("saved");
  }

  function getMissingFields(): string[] {
    const missing: string[] = [];
    if (!form.age) missing.push(REQUIRED_FIELD_LABELS.age);
    if (!form.gender) missing.push(REQUIRED_FIELD_LABELS.gender);
    if (!form.locationCity) missing.push(REQUIRED_FIELD_LABELS.locationCity);
    if (!form.locationState) missing.push(REQUIRED_FIELD_LABELS.locationState);
    if (!form.locationCountry) missing.push(REQUIRED_FIELD_LABELS.locationCountry);
    if (!form.occupation) missing.push(REQUIRED_FIELD_LABELS.occupation);
    if (form.ethnicities.length === 0) missing.push(REQUIRED_FIELD_LABELS.ethnicities);
    return missing;
  }

  async function handlePublish() {
    // Publish validates against whatever's currently saved in the DB,
    // not unsaved form state — save first so the two can't disagree.
    await handleSave();

    const missing = getMissingFields();
    if (missing.length > 0) {
      setPublishStatus("error");
      setPublishError(missing);
      return;
    }

    setPublishStatus("publishing");
    const supabase = createClient();
    const { error } = await supabase
      .from("users")
      .update({ published_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      setPublishStatus("error");
      setPublishError([]);
      return;
    }

    setPublishStatus("idle");
    setPublishError([]);
    setPublished(true);
  }

  return (
    <main className="max-w-lg mx-auto px-6 py-12">
      <h1 className="font-serif text-2xl text-stone-900 mb-1">My Profile</h1>
      <p className="text-sm text-stone-500 mb-6">
        Basics — Phase 1 scope only, no categories/dealbreakers/AI Matchmaker yet.
      </p>

      {published ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 mb-6 text-sm text-emerald-800">
          Your profile is published.
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6">
          <p className="text-xs text-amber-800 mb-2">
            Your profile isn&apos;t published yet. Fill in Basics below, then publish.
          </p>
          <button
            type="button"
            onClick={handlePublish}
            disabled={publishStatus === "publishing"}
            className="text-xs font-semibold bg-amber-600 text-white rounded-full px-4 py-2 hover:bg-amber-700 disabled:opacity-50"
          >
            {publishStatus === "publishing" ? "Publishing…" : "Publish profile"}
          </button>
          {publishStatus === "error" && publishError.length > 0 && (
            <p className="text-xs text-red-700 mt-2">
              Can&apos;t publish yet — missing: {publishError.join(", ")}.
            </p>
          )}
          {publishStatus === "error" && publishError.length === 0 && (
            <p className="text-xs text-red-700 mt-2">Something went wrong publishing. Try again.</p>
          )}
        </div>
      )}

      <div className="space-y-4 bg-white border border-stone-200 rounded-2xl p-5">
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Age</label>
          <input
            type="number"
            min={18}
            max={99}
            value={form.age ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, age: e.target.value ? Number(e.target.value) : null }))}
            className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Gender</label>
          <select
            value={form.gender}
            onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
            className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          >
            <option value="">Select…</option>
            <option>Woman</option>
            <option>Man</option>
            <option>Non-binary</option>
          </select>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">City</label>
            <input
              type="text"
              value={form.locationCity}
              onChange={(e) => setForm((f) => ({ ...f, locationCity: e.target.value }))}
              className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">State</label>
            <input
              type="text"
              value={form.locationState}
              onChange={(e) => setForm((f) => ({ ...f, locationState: e.target.value }))}
              className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 mb-1.5">Country</label>
            <input
              type="text"
              value={form.locationCountry}
              onChange={(e) => setForm((f) => ({ ...f, locationCountry: e.target.value }))}
              className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">Occupation</label>
          <input
            type="text"
            value={form.occupation}
            onChange={(e) => setForm((f) => ({ ...f, occupation: e.target.value }))}
            className="w-full text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-500 mb-1.5">
            Ethnicity / cultural background
          </label>
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
              className="flex-1 min-w-0 text-sm text-stone-900 bg-white border border-stone-300 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-300"
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

        <div className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="text-sm font-medium bg-accent-600 text-white rounded-full px-4 py-2 hover:bg-accent-700 disabled:opacity-50"
          >
            {saveStatus === "saving" ? "Saving…" : "Save"}
          </button>
          {saveStatus === "saved" && <span className="text-xs text-emerald-700">Saved.</span>}
          {saveStatus === "error" && <span className="text-xs text-red-700">Save failed.</span>}
        </div>
      </div>
    </main>
  );
}
