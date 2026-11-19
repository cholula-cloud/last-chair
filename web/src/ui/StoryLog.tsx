"use client";

import { MOUNTAIN_CALENDARS } from "@/game/calendar";
import { operatingGoalText } from "@/game/winterArc";
import { TIPS } from "@/game/coach";
import { STORY_BEATS, WINTER_GOAL } from "@/game/content";
import { SCHOOL_BUS_PUPILS } from "@/game/schoolContract";
import { liquidNetWorth } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { surpriseRadio } from "@/game/surprises";
import { schoolMemory } from "@/game/winterMemory";
import { useSettings } from "@/ui/settingsStore";
import { useCoach } from "@/ui/coachStore";
import { Sheet } from "@/ui/kit/Sheet";

export function StoryEntries() {
  const beats = useGameStore(s => s.beatLog);
  const firstDay = useGameStore(s => s.dayIndex === 1 && s.outcome === "playing");
  const tipIndex = useCoach(s => s.index);
  const tipsReady = tipIndex === 0;
  const remaining = useGameStore(s => s.outcome === "playing" ? s.seasonLength - s.dayIndex + Number(s.phase !== "night") : 0);
  const netCash = useGameStore(liquidNetWorth);
  const days = useGameStore(s => s.seasonDays);
  const operatingGoal = useGameStore(s => operatingGoalText(MOUNTAIN_CALENDARS[s.mountainId], s.dayHistory));
  const moments = useGameStore(s => s.surpriseLog);
  const playing = useGameStore(s => s.outcome === "playing");
  const schoolOffer = useGameStore(s => s.pendingBeat === "school_bus");
  const school = useGameStore(s => s.schoolContract);
  const deal = useGameStore(s => s.summitLinkDecision);
  const muted = useSettings(s => s.muted);
  const radio = useSettings(s => s.radioEnabled);
  const set = useSettings(s => s.set);
  const entries = [
    ...beats.map(({ day, id }) => {
      const beat = STORY_BEATS.find(beat => beat.id === id)!;
      return { day, title: beat.title, text: day === null ? "Broadcast date unrecorded." : beat.radio };
    }),
    ...days.flatMap(day => day.lodgeOpening ? [{
      day: day.day, title: `Lodge Tier ${day.lodgeOpening}`,
      text: day.lodgeOpening === 2 ? "The crew finished the lodge addition. There’s room to bring the ski school back." : "The crew finished the last lodge addition. Dutch Hill reached Tier 3.",
    }] : []),
    ...moments.map(entry => {
      const copy = surpriseRadio(entry);
      return { day: entry.dayIndex, title: copy.title, text: copy.radio };
    }),
  ].sort((a, b) => (a.day ?? 0) - (b.day ?? 0));
  return <div className="space-y-3">
    <section className="panel px-3 py-2">
      <h3 className="font-extrabold">Winter goal</h3>
      <p>{WINTER_GOAL}</p>
      <p>{remaining} {remaining === 1 ? "day" : "days"} left · {formatMoney(netCash)} after debt and construction</p>
      <p className="mt-2"><strong>Operating goals</strong> · {operatingGoal}</p>
      {(schoolOffer || school) && <p className="mt-2"><strong>Optional Readsboro goal</strong> · {
        school?.decision === "declined" ? "Visit declined."
          : school?.decision === "accepted" && school.pupilsTaught !== null
            ? `${school.pupilsTaught} of ${SCHOOL_BUS_PUPILS} pupils finished a lesson.`
            : `Give each of the ${SCHOOL_BUS_PUPILS} visiting pupils a lesson.`
      }</p>}
    </section>
    <div className="flex flex-wrap gap-2">
      <button className="key min-h-11 px-3" aria-pressed={!muted} onClick={() => set({ muted: !muted })}>Sound {muted ? "off" : "on"}</button>
      <button className="key min-h-11 px-3" aria-pressed={radio} onClick={() => set({ radioEnabled: !radio })}>Radio {radio ? "on" : "off"}</button>
      {firstDay && tipIndex < TIPS.length && <button className="key min-h-11 px-3" onClick={() => useCoach.getState().skip()}>Skip tips</button>}
      <button className="key min-h-11 px-3" disabled={!firstDay && tipsReady} onClick={() => {
        const coach = useCoach.getState();
        coach.replay();
        coach.observe(useGameStore.getState());
      }}>{firstDay ? "Replay tips" : tipsReady ? "Tips ready for next winter" : "Replay tips next winter"}</button>
    </div>
    {!entries.length && <p>The first broadcast comes after the hill opens.</p>}
    {entries.map(entry => <article className="border-b border-ink/20 pb-2" key={`${entry.day}-${entry.title}`}>
      <h3 className="font-bold">{entry.day ? `Day ${entry.day} · ` : ""}{entry.title}</h3><p>{entry.text}</p>
    </article>)}
    {school && <p>{playing && school.decision === "accepted" && school.pupilsTaught === null
      ? `The Readsboro visit is booked for day ${school.day}.` : schoolMemory(school)}</p>}
    {deal && <p>{deal === "accepted" ? "Vivian paid $6,000. The fare ceiling is Balanced." : "You declined Vivian’s offer."}</p>}
  </div>;
}

export function StoryLogSheet({ onClose }: { onClose: () => void }) {
  return <Sheet modal focusClose title="Story log" onClose={onClose}><StoryEntries /></Sheet>;
}
