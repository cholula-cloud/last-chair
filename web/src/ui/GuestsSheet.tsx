"use client";

import { useMemo } from "react";
import { useGameStore } from "@/game/store";
import type { GuestState } from "@/game/types";
import { PaperSheet } from "@/ui/kit/PaperSheet";

const STATE_WORD: Record<GuestState, string> = {
  pending: "Not here yet",
  gone: "Gone home",
  arrive: "Arriving",
  queue: "In the lift line",
  ride: "Riding up",
  ski: "Skiing down",
  depart: "Heading home",
};

export function GuestsSheet({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const allGuests = useGameStore((s) => s.guests);
  // Guests who have not arrived or have gone home are not on the hill, so they are not listed.
  const guests = useMemo(
    () => allGuests.filter((g) => g.state !== "pending" && g.state !== "gone"),
    [allGuests],
  );
  const followId = useGameStore((s) => s.followId);
  const setFollowId = useGameStore((s) => s.setFollowId);

  if (!open) return null;

  return (
    <PaperSheet
      title="Guests"
      subtitle={`${guests.length} on the hill. Follow one and the camera goes with them.`}
      onClose={onClose}
      closeLabel="Close guests sheet"
    >
      {guests.length === 0 && (
        <p className="py-6 text-center text-[0.9rem] text-ink-soft">
          Nobody on the hill right now. Guests arrive from 8 AM and head home by 4.
        </p>
      )}
      <ul className="divide-y divide-dashed divide-ink/20">
        {guests.map((g) => {
          const following = followId === g.id;
          return (
            <li key={g.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-[0.95rem] font-semibold text-ink">
                  {g.label}
                </p>
                <p className="text-[0.8rem] text-ink-soft">
                  {STATE_WORD[g.state]}
                </p>
              </div>
              <button
                type="button"
                aria-pressed={following}
                onClick={() => {
                  setFollowId(following ? null : g.id);
                  onClose();
                }}
                className={`press min-h-11 min-w-[6.5rem] rounded-full px-4 text-[0.85rem] font-semibold ${
                  following
                    ? "bg-pine text-paper"
                    : "border-[1.5px] border-pine text-pine"
                }`}
              >
                {following ? "Following" : "Follow"}
              </button>
            </li>
          );
        })}
      </ul>
    </PaperSheet>
  );
}
