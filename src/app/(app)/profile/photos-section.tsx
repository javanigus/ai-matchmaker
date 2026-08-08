"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Photo = {
  id: string;
  type: "learning" | "profile";
  moderationStatus: "pending" | "approved" | "rejected";
  moderationReason: string | null;
  position: number | null;
  storagePath: string;
  url: string;
};

const STATUS_STYLES: Record<Photo["moderationStatus"], string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
};
const STATUS_LABELS: Record<Photo["moderationStatus"], string> = {
  pending: "Under review",
  approved: "Approved",
  rejected: "Rejected",
};

export default function PhotosSection({ initial }: { initial: Photo[] }) {
  const [photos, setPhotos] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(file: File) {
    setError(null);
    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", "profile");

    const res = await fetch("/api/photos", { method: "POST", body: formData });
    const data = await res.json();

    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Couldn't upload that photo — try again.");
      return;
    }
    // The server response already carries the resolved moderation
    // status (approve/reject happens synchronously during upload) or
    // stillChecking:true if the LLM call failed — either way there's
    // no signed URL for a brand-new upload in this response, so
    // refetch the page's data on next load rather than fake one here.
    // For an immediate visual result, just prepend a placeholder-free
    // entry using the photo id and re-derive the URL isn't available
    // client-side (signed URLs are only ever generated server-side) —
    // so show the new photo via a page refresh.
    window.location.reload();
  }

  async function handleDelete(photo: Photo) {
    setDeletingId(photo.id);
    const supabase = createClient();
    await supabase.storage.from("photos").remove([photo.storagePath]);
    const { error: deleteError } = await supabase.from("photos").delete().eq("id", photo.id);
    setDeletingId(null);
    if (deleteError) {
      setError("Couldn't delete that photo — try again.");
      return;
    }
    setPhotos((list) => list.filter((p) => p.id !== photo.id));
  }

  return (
    <div className="mb-10">
      <h2 className="font-serif text-lg text-stone-900 mb-1">Photos</h2>
      <p className="text-xs text-stone-500 mb-4">
        New photos are automatically checked before they can appear publicly, usually within a few seconds.
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-4">
        {photos.map((photo) => (
          <div key={photo.id} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 bg-stone-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.url}
              alt=""
              className={`w-full h-full object-cover ${photo.moderationStatus === "pending" ? "opacity-60" : ""}`}
            />
            <span className={`absolute top-1.5 left-1.5 text-[10px] font-medium rounded-full px-2 py-0.5 ${STATUS_STYLES[photo.moderationStatus]}`}>
              {STATUS_LABELS[photo.moderationStatus]}
            </span>
            <button
              type="button"
              onClick={() => handleDelete(photo)}
              disabled={deletingId === photo.id}
              className="absolute bottom-1.5 right-1.5 text-[10px] font-medium bg-white/90 text-stone-600 rounded-full px-2 py-0.5 hover:bg-white disabled:opacity-50"
            >
              {deletingId === photo.id ? "Removing…" : "Remove"}
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="aspect-square rounded-xl border-2 border-dashed border-stone-300 text-stone-400 text-xs font-medium flex items-center justify-center hover:border-accent-400 hover:text-accent-600 disabled:opacity-50"
        >
          {uploading ? "Under review…" : "+ Add photo"}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
            e.target.value = "";
          }}
        />
      </div>

      {error && <p className="text-xs text-red-700">{error}</p>}
    </div>
  );
}
