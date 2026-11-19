"use client";

import { STORY_BEATS, WINTER_GOAL } from "@/game/content";
import { useGameStore } from "@/game/store";
import { surpriseRadio } from "@/game/surprises";
import { schoolMemory } from "@/game/winterMemory";
import { useSettings } from "@/ui/settingsStore";
import { useCoach } from "@/ui/coachStore";
import { Sheet } from "@/ui/kit/Sheet";

export function StoryEntries() {
  const beats = useGameStore(s => s.beatLog);
  const days = useGameStore(s => s.seasonDays);
  const moments = useGameStore(s => s.surpriseLog);
  const playing = useGameStore(s => s.outcome === "playing");
  const school = useGameStore(s => s.schoolContract);
  const deal = useGameStore(s => s.summitLinkDecision);
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
    <p><strong>Winter goal</strong> · {WINTER_GOAL}</p>
    <div className="flex flex-wrap gap-2">
      <button className="key min-h-11 px-3" aria-pressed={radio} onClick={() => set({ radioEnabled: !radio })}>Radio {radio ? "on" : "off"}</button>
      <button className="key min-h-11 px-3" onClick={() => useCoach.getState().replay()}>Replay tips</button>
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
