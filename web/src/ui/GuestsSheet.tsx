"use client";

import { useMemo } from "react";
import type { AssetId } from "@/game/base";
import { satisfactionContext } from "@/game/rules";
import { guestSatisfaction } from "@/game/satisfaction";
import { useGameStore } from "@/game/store";
import type { GuestState } from "@/game/types";
import { Sheet } from "@/ui/kit/Sheet";

const STATE_WORD: Record<GuestState, string> = {
  pending: "Not here yet",
  gone: "Gone home",
  arrive: "Arriving",
  queue: "In the lift line",
  ride: "Riding up",
  walk_lift: "Walking to lift",
  walk_out: "Walking to base",
  ski: "Skiing down",
  refuel: "Taking a break",
  depart: "Heading home",
};

const VENUE_ACTIVITY: Partial<Record<AssetId, string>> = {
  warming_hut: "Warming up",
  cafe: "At the café",
  rentals: "Picking up rentals",
  ski_school: "Taking a lesson",
};

function moodWord(score: number): string {
  if (score >= 70) return "Happy";
  if (score >= 50) return "Okay";
  return "Unhappy";
}

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
  const fare = useGameStore((s) => s.fare);
  const buildings = useGameStore((s) => s.buildings);
  const assets = useGameStore((s) => s.assets);
  const founderId = useGameStore((s) => s.founderId);
  const weather = useGameStore((s) => s.weather);
  const clockMin = useGameStore((s) => s.clockMin);
  const talentsOwned = useGameStore((s) => s.talentsOwned);
  const dayIndex = useGameStore((s) => s.dayIndex);
  const weatherDays = useGameStore((s) => s.weatherDays);
  const mountainId = useGameStore((s) => s.mountainId);
  const followId = useGameStore((s) => s.followId);
  const setFollowId = useGameStore((s) => s.setFollowId);

  if (!open) return null;
  const ctx = satisfactionContext({
    fare, buildings, assets, founderId, weather, clockMin, talentsOwned, dayIndex, weatherDays, mountainId,
  });

  return (
    <Sheet
      title="Guests"
      subtitle={`${guests.length} on the hill. Follow one and the camera goes with them.`}
      onClose={onClose}
      closeLabel="Close guests sheet"
    >
      <div className="panel px-3.5 py-1">
        {guests.length === 0 && (
          <p className="py-6 text-center text-[0.92rem] font-bold text-ink-soft">
            Nobody on the hill right now. Guests arrive from 8 AM and head home by 4.
          </p>
        )}
        <ul>
          {guests.map((g) => {
            const following = followId === g.id;
            const venue = g.state === "refuel" ? assets[g.venueIndex ?? -1] : undefined;
            const activity = (venue && VENUE_ACTIVITY[venue.id]) ?? STATE_WORD[g.state];
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 border-b-2 border-snow-2 py-2.5 last:border-b-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[1rem] font-extrabold">
                    {g.label}
                  </p>
                  <p className="text-[0.85rem] font-bold text-ink-soft">
                    {activity}, {moodWord(guestSatisfaction(g, ctx)).toLowerCase()}
                  </p>
                </div>
                <button
                  type="button"
                  aria-pressed={following}
                  onClick={() => {
                    setFollowId(following ? null : g.id);
                    onClose();
                  }}
                  className="key key-sm press min-h-11 min-w-[6.5rem] px-4 text-[0.92rem] font-extrabold"
                >
                  {following ? "Following" : "Follow"}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
