"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Blocked = { blockId: string; userId: string; name: string };

export default function BlockedUsersClient({ initialBlocked }: { initialBlocked: Blocked[] }) {
  const [items, setItems] = useState(initialBlocked);
  const [unblockingId, setUnblockingId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function unblock(blockId: string) {
    setUnblockingId(blockId);
    setError("");
    const supabase = createClient();
    const { error: unblockError } = await supabase.from("blocks").delete().eq("id", blockId);
    setUnblockingId(null);
    if (unblockError) {
      setError("Couldn't unblock — try again.");
      return;
    }
    setItems((list) => list.filter((b) => b.blockId !== blockId));
  }

  return (
    <div className="bg-white border border-stone-200 rounded-2xl p-5">
      <h2 className="font-serif text-lg text-stone-900 mb-1">Blocked users</h2>
      <p className="text-xs text-stone-500 mb-4">
        People you block won&apos;t appear anywhere on AI Matchmaker, and you won&apos;t appear to them.
      </p>

      {error && <p className="text-xs text-red-700 mb-3">{error}</p>}

      {items.length === 0 ? (
        <p className="text-sm text-stone-400 italic">You haven&apos;t blocked anyone.</p>
      ) : (
        <ul className="divide-y divide-stone-100">
          {items.map((b) => (
            <li key={b.blockId} className="flex items-center justify-between py-2.5">
              <span className="text-sm text-stone-700">{b.name}</span>
              <button
                type="button"
                onClick={() => unblock(b.blockId)}
                disabled={unblockingId === b.blockId}
                className="text-xs font-medium text-accent-700 hover:underline disabled:opacity-50"
              >
                {unblockingId === b.blockId ? "Unblocking…" : "Unblock"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
