"use client";

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import type { AssetId } from "@/game/base";
import { satisfactionContext } from "@/game/rules";
import { guestSatisfaction } from "@/game/satisfaction";
import { useGameStore } from "@/game/store";
import type { GuestState } from "@/game/types";
import { moodTone, satisfactionMoodWord } from "@/game/moodLabels";
import { Sheet } from "@/ui/kit/Sheet";
import { MoodIcon } from "@/ui/kit/icons";

const STATE_WORD: Record<GuestState, string> = {
  pending: "Not here yet",
  gone: "Gone home",
  arrive: "Pulling in",
  queue: "Waiting for the lift",
  ride: "Riding up",
  walk_lift: "Trudging to the lift",
  walk_out: "Trudging back to the base",
  ski: "Skiing down",
  refuel: "Taking a break",
  depart: "Heading home",
};

const VENUE_ACTIVITY: Partial<Record<AssetId, string>> = {
  warming_hut: "Thawing out in the warming hut",
  cafe: "Grabbing a bite at the café",
  rentals: "Picking up rentals",
  ski_school: "Taking a lesson",
};

const MOOD_CHIP: Record<ReturnType<typeof moodTone>, string> = {
  good: "bg-sign-green text-white",
  watch: "bg-gold text-ink",
  bad: "bg-barn-deep text-white",
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
  const ctx = useGameStore(useShallow(satisfactionContext));
  const assets = useGameStore((s) => s.assets);
  const followId = useGameStore((s) => s.followId);
  const setFollowId = useGameStore((s) => s.setFollowId);
  const guestLens = useGameStore((s) => s.guestLens);
  const setGuestLens = useGameStore((s) => s.setGuestLens);

  if (!open) return null;

  return (
    <Sheet
      wide
      title="Guests"
      subtitle={`${guests.length} on the hill. Follow one and the camera goes with them.`}
      onClose={onClose}
      closeLabel="Close guests sheet"
    >
      <div className="panel mb-2 px-3.5 py-2">
        <label className="flex min-h-11 cursor-pointer items-center gap-2 text-[0.92rem] font-extrabold">
          <input
            type="checkbox"
            className="size-5 accent-barn"
            checked={guestLens === "mood"}
            onChange={(e) => setGuestLens(e.target.checked ? "mood" : "off")}
          />
          Colour jackets by mood on the hill
        </label>
        {guestLens === "mood" && (
          <ul className="mt-2 flex flex-wrap gap-2 text-[0.8rem] font-bold text-ink-soft" aria-label="Mood colour legend">
            <li className="flex items-center gap-1">
              <MoodIcon mood={75} className="size-5" aria-hidden />
              Happy (70+)
            </li>
            <li className="flex items-center gap-1">
              <MoodIcon mood={60} className="size-5" aria-hidden />
              Mixed (50–69)
            </li>
            <li className="flex items-center gap-1">
              <MoodIcon mood={40} className="size-5" aria-hidden />
              Grumpy (under 50)
            </li>
          </ul>
        )}
      </div>
      <div className="panel px-3.5 py-1">
        {guests.length === 0 && (
          <p className="py-6 text-center text-[0.92rem] font-bold text-ink-soft">
            No skiers on the hill right now. Lifts run from 8 AM to 4 PM.
          </p>
        )}
        <ul className="grid grid-cols-1 gap-2 md:grid-cols-2">
          {guests.map((g) => {
            const following = followId === g.id;
            const venue = g.state === "refuel" ? assets[g.venueIndex ?? -1] : undefined;
            const activity = (venue && VENUE_ACTIVITY[venue.id]) ?? STATE_WORD[g.state];
            const score = guestSatisfaction(g, ctx);
            const mood = satisfactionMoodWord(score);
            const tone = moodTone(score);
            return (
              <li
                key={g.id}
                className="flex items-center gap-3 border-b-2 border-snow-2 py-2.5 last:border-b-0 md:border-b-0 md:py-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="truncate text-[1rem] font-extrabold">
                      {g.label}
                    </p>
                    <span className={`inline-flex shrink-0 items-center rounded-[8px] border-2 border-ink px-2 py-0.5 text-[0.72rem] font-extrabold ${MOOD_CHIP[tone]}`}>
                      {mood}
                    </span>
                  </div>
                  <p className="text-[0.85rem] font-bold text-ink-soft">
                    {activity}
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