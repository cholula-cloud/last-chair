"use client";

import { useMemo, useState } from "react";
import { LODGE_TIERS } from "@/game/base";
import { talentNeedLabel } from "@/game/content";
import { useGameStore } from "@/game/store";
import {
  canUnlockTalent,
  CREW_POINT_COST,
  talentRequiresTier,
} from "@/game/talentProgress";
import { CREW_ROLES, CREW_TALENTS, type CrewMember } from "@/game/talents";

const CREW_ORDER: CrewMember[] = ["Frank", "Dana", "Elena"];
type CrewFilter = "All" | CrewMember;

function talentsFor(member: CrewMember) {
  return CREW_TALENTS.filter((t) => t.crew === member);
}

function SkillCard({ talentId }: { talentId: (typeof CREW_TALENTS)[number]["id"] }) {
  const state = useGameStore();
  const talent = CREW_TALENTS.find((t) => t.id === talentId)!;
  const owned = state.talentsOwned.includes(talent.id);
  const open = canUnlockTalent(state, talent.id);
  const tier = talentRequiresTier(talent.id);
  const need = owned ? talentNeedLabel(talent, state) : null;

  return (
    <div className="rounded-[var(--r-chip)] border-2 border-ink bg-white p-2.5">
      <p className="text-sm font-extrabold leading-snug text-ink">{talent.name}</p>
      <p className="mt-1 text-xs font-bold leading-snug text-ink-soft">{talent.effect}</p>
      <div className="mt-2">
        {owned ? (
          need ? (
            <span className="inline-flex min-h-8 items-center rounded-full border-2 border-ink bg-gold px-2.5 text-[0.7rem] font-extrabold text-ink">
              {need}
            </span>
          ) : (
            <span className="inline-flex min-h-8 items-center rounded-full border-2 border-ink bg-sign-green px-2.5 text-[0.7rem] font-extrabold text-white">
              Active
            </span>
          )
        ) : open ? (
          <button
            type="button"
            onClick={() => state.pickCrewTalent(talent.id)}
            className="key press flex min-h-10 w-full items-center justify-center px-2 text-xs font-extrabold"
          >
            Unlock ({CREW_POINT_COST} pt)
          </button>
        ) : state.lodgeTier < tier ? (
          <span className="inline-flex min-h-8 items-center rounded-full border-2 border-ink bg-snow-2 px-2.5 text-[0.7rem] font-extrabold text-ink-soft">
            Needs {LODGE_TIERS[tier].label}
          </span>
        ) : (
          <span className="inline-flex min-h-8 items-center rounded-full border-2 border-ink bg-snow-2 px-2.5 text-[0.7rem] font-extrabold text-ink-soft">
            Locked
          </span>
        )}
      </div>
    </div>
  );
}

export function TalentTreePanel() {
  const state = useGameStore();
  const [filter, setFilter] = useState<CrewFilter>("All");
  const byCrew = useMemo(
    () => Object.fromEntries(CREW_ORDER.map((m) => [m, talentsFor(m)])) as Record<CrewMember, typeof CREW_TALENTS>,
    [],
  );

  return (
    <section className="space-y-3" aria-label="Crew skills">
      <div className="panel space-y-2 px-3 py-2.5">
        <p className="text-sm font-extrabold">
          <span className="chip bg-gold px-2 py-0.5 tabular-nums">
            {state.crewPoints} crew {state.crewPoints === 1 ? "point" : "points"} available
          </span>
        </p>
        <p className="text-xs font-bold leading-snug text-ink-soft">
          Earn 1 point each night you sleep, plus 1 when a lodge upgrade opens. Spend points to unlock skills below.
        </p>
      </div>

      <div
        className="flex gap-1 rounded-[var(--r-key)] border-2 border-ink bg-snow-2 p-1 md:hidden"
        role="group"
        aria-label="Crew filter"
      >
        {(["All", ...CREW_ORDER] as const).map((id) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className={`min-h-10 flex-1 rounded-[calc(var(--r-key)-4px)] text-[0.7rem] font-extrabold ${
              filter === id ? "bg-sign-green text-white shadow-[0_2px_0_var(--ink)]" : "text-ink"
            }`}
          >
            {id}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 md:grid md:grid-cols-3 md:gap-3">
        {CREW_ORDER.map((member) => {
          if (filter !== "All" && filter !== member) return null;
          const role = CREW_ROLES[member];
          return (
            <div key={member} className="space-y-2">
              <h4 className="text-sm font-extrabold text-ink">
                {member}: {role.role}
              </h4>
              <ul className="flex flex-col gap-2">
                {byCrew[member].map((talent) => (
                  <li key={talent.id}>
                    <SkillCard talentId={talent.id} />
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}