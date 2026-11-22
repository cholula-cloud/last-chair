"use client";

import { seasonCalendar } from "@/game/calendar";
import { operatingGoalText } from "@/game/winterArc";
import { dryWeekRadio, formatOperatorText, STORY_BEATS, WINTER_GOAL } from "@/game/content";
import { SCHOOL_BUS_PUPILS } from "@/game/schoolContract";
import { liquidNetWorth } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { lodgeOpeningRadio } from "@/game/deskRadio";
import { surpriseRadio } from "@/game/surprises";
import { schoolMemory } from "@/game/winterMemory";
import { SUMMIT_LINK_PAYMENT } from "@/game/summitLink";
import { useSettings } from "@/ui/settingsStore";

export function StoryEntries({ compact = false }: { compact?: boolean }) {
  const beats = useGameStore(s => s.beatLog);
  const remaining = useGameStore(s => s.outcome === "playing" ? s.seasonLength - s.dayIndex + Number(s.phase !== "night") : 0);
  const netCash = useGameStore(liquidNetWorth);
  const days = useGameStore(s => s.seasonDays);
  const operatingGoal = useGameStore(s => operatingGoalText(seasonCalendar(s), s.dayHistory));
  const moments = useGameStore(s => s.surpriseLog);
  const playing = useGameStore(s => s.outcome === "playing");
  const schoolOffer = useGameStore(s => s.pendingBeat === "school_bus");
  const school = useGameStore(s => s.schoolContract);
  const deal = useGameStore(s => s.summitLinkDecision);
  const operatorName = useGameStore(s => s.operatorName ?? null);
  const gunsCount = useGameStore(s => s.guns.length);
  const fare = useGameStore(s => s.fare);
  const muted = useSettings(s => s.muted);
  const radio = useSettings(s => s.radioEnabled);
  const set = useSettings(s => s.set);
  const entries = [
    ...beats.map(({ day, id }) => {
      const beat = STORY_BEATS.find(beat => beat.id === id)!;
      const raw = beat.id === "dry_week" ? dryWeekRadio(gunsCount) : beat.radio;
      return {
        day,
        title: beat.title,
        text: day === null ? "Maris was on the air, but nobody wrote down the day." : formatOperatorText(raw, operatorName),
      };
    }),
    ...days.flatMap(day => day.lodgeOpening ? [{
      day: day.day, title: `Lodge Tier ${day.lodgeOpening}`,
      text: lodgeOpeningRadio(day.lodgeOpening),
    }] : []),
    ...moments.map(entry => {
      const copy = surpriseRadio(entry, operatorName, { fare });
      return { day: entry.dayIndex, title: copy.title, text: copy.radio };
    }),
  ].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
  return <div className="space-y-3">
    {!compact && (
      <>
        <section className="panel px-3 py-2">
          <h3 className="font-extrabold">Winter goal</h3>
          <p>{WINTER_GOAL}</p>
          <p>{remaining} {remaining === 1 ? "day" : "days"} left. {formatMoney(netCash)} after debt and construction.</p>
          <p className="mt-2"><strong>Operating goals.</strong> {operatingGoal}</p>
          {(schoolOffer || school) && <p className="mt-2"><strong>Optional Readsboro goal.</strong> {
            school?.decision === "declined" ? "You turned down the visit."
              : school?.decision === "accepted" && school.pupilsTaught !== null
                ? `${school.pupilsTaught} of ${SCHOOL_BUS_PUPILS} pupils finished a lesson.`
                : `Get each of the ${SCHOOL_BUS_PUPILS} visiting pupils through a lesson.`
          }</p>}
        </section>
        <div className="flex flex-wrap gap-2">
          <button className="key min-h-11 px-3" aria-pressed={!muted} onClick={() => set({ muted: !muted })}>Sound {muted ? "off" : "on"}</button>
          <button className="key min-h-11 px-3" aria-pressed={radio} onClick={() => set({ radioEnabled: !radio })}>Radio {radio ? "on" : "off"}</button>
          <button className="key min-h-11 px-3" onClick={() => {
            useGameStore.getState().resetTips();
            set({ tips: true });
          }}>Replay tips</button>
        </div>
      </>
    )}
    {!entries.length && <p className="text-sm font-bold text-ink-soft">Maris has not said a word yet. The first broadcast comes after the hill opens.</p>}
    {entries.map(entry => <article className="border-b border-ink/20 pb-2" key={`${entry.day}-${entry.title}`}>
      <h3 className="font-bold">{entry.day ? `Day ${entry.day}: ` : ""}{entry.title}</h3><p className="text-sm font-bold leading-snug">{entry.text}</p>
    </article>)}
    {school && <p className="text-sm font-bold">{playing && school.decision === "accepted" && school.pupilsTaught === null
      ? `The Readsboro bus is booked for day ${school.day}.` : schoolMemory(school)}</p>}
    {deal && <p className="text-sm font-bold">{deal === "accepted" ? `Sloane wired ${formatMoney(SUMMIT_LINK_PAYMENT)}. Tickets top out at Balanced this winter.` : "You turned down Sloane's Whiterock offer. Dutch Hill sets its own fares."}</p>}
  </div>;
}