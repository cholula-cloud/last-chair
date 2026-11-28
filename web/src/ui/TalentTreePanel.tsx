"use client";

import { useMemo, useState } from "react";
import { LODGE_TIERS } from "@/game/base";
import { talentNeedLabel } from "@/game/content";
import { useGameStore } from "@/game/store";
import {
  canUnlockTalent,
  CREW_COLUMN_MIN_TIER,
  CREW_POINT_COST,
  talentBlockReason,
  talentRequiresTier,
  talentsForCrew,
  type TalentId,
} from "@/game/talentProgress";
import { CREW_ROLES, CREW_TALENTS, type CrewMember } from "@/game/talents";
import { CastPatch } from "@/ui/kit/CastPatches";
import { CheckIcon, LockIcon } from "@/ui/kit/icons";
import { SegmentedControl } from "@/ui/kit/SegmentedControl";
import { useReducedMotion } from "@/ui/motion";

const CREW_ORDER: CrewMember[] = ["Frank", "Dana", "Elena"];

const CREW_PATCH: Record<CrewMember, "frank" | "dana" | "elena"> = {
  Frank: "frank",
  Dana: "dana",
  Elena: "elena",
};

function blockLabel(
  block: ReturnType<typeof talentBlockReason>,
  talent: (typeof CREW_TALENTS)[number],
  tier: number,
): string {
  if (block === "column") return `Needs ${LODGE_TIERS[CREW_COLUMN_MIN_TIER[talent.crew]].label}`;
  if (block === "lodge") return `Needs ${LODGE_TIERS[tier as 1 | 2 | 3].label}`;
  if (block === "prerequisite") return "Needs skill above";
  if (block === "points") return "Need 1 point";
  return "Locked";
}

function StickyInspectBar({
  talentId,
  onUnlocked,
}: {
  talentId: TalentId;
  onUnlocked: (id: TalentId) => void;
}) {
  const state = useGameStore();
  const talent = CREW_TALENTS.find((t) => t.id === talentId)!;
  const owned = state.talentsOwned.includes(talent.id);
  const open = canUnlockTalent(state, talent.id);
  const need = owned ? talentNeedLabel(talent, state) : null;
  const block = talentBlockReason(state, talent.id);
  const tier = talentRequiresTier(talent.id);

  return (
    <div className="sticky bottom-0 z-10 -mx-4 bg-sky px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2">
      <div
        key={talent.id}
        className="panel beat-swap space-y-2.5 p-3.5 [--lift:4px]"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="display text-[1.15rem] leading-tight text-ink">{talent.name}</p>
            <p className="mt-1 text-xs font-bold leading-snug text-ink-soft">{talent.effect}</p>
          </div>
          {owned && (
            <span
              className={`shrink-0 whitespace-nowrap rounded-full border-2 border-ink px-2.5 py-0.5 text-[0.72rem] font-extrabold ${
                need ? "bg-gold text-ink" : "bg-sign-green text-white"
              }`}
            >
              {need ?? "Active"}
            </span>
          )}
        </div>

        {!owned && open && (
          <button
            type="button"
            onClick={() => {
              state.pickCrewTalent(talent.id);
              onUnlocked(talent.id);
            }}
            className="key key-solid press flex min-h-11 w-full items-center justify-center px-3 text-sm font-extrabold [--key-fill:var(--sign-green)] [--key-ink:#fff] [--lift:3px]"
          >
            Unlock ({CREW_POINT_COST} pt)
          </button>
        )}

        {!owned && !open && (
          <div className="well inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-extrabold text-ink-soft">
            <LockIcon size={13} />
            <span>{blockLabel(block, talent, tier)}</span>
          </div>
        )}
      </div>
    </div>
  );
}

export function TalentTreePanel() {
  const state = useGameStore();
  const reduceMotion = useReducedMotion();
  const [crew, setCrew] = useState<CrewMember>("Frank");
  const [pickedId, setPickedId] = useState<TalentId | null>(null);
  const [flashId, setFlashId] = useState<TalentId | null>(null);

  const talents = useMemo(() => talentsForCrew(crew), [crew]);
  const activeId = useMemo(() => {
    if (pickedId && talents.some((t) => t.id === pickedId)) return pickedId;
    return talents.find((t) => canUnlockTalent(state, t.id))?.id ?? talents[0]!.id;
  }, [pickedId, talents, state]);

  const role = CREW_ROLES[crew];
  const columnMinTier = CREW_COLUMN_MIN_TIER[crew];
  const columnLocked = state.lodgeTier < columnMinTier;

  return (
    <section className="space-y-3" aria-label="Talent tree">
      <div className="flex items-center gap-2.5">
        <span className="chip shrink-0 whitespace-nowrap bg-gold px-2.5 py-1 text-sm font-extrabold tabular-nums [--lift:2px]">
          {state.crewPoints} {state.crewPoints === 1 ? "point" : "points"}
        </span>
        <p className="min-w-0 text-xs font-bold leading-snug text-ink">
          One point most nights. Deepen a track or spread out.
        </p>
      </div>

      <SegmentedControl
        ariaLabel="Crew member"
        value={crew}
        onChange={(next) => {
          setCrew(next);
          setPickedId(null);
        }}
        options={CREW_ORDER.map((id) => {
          const list = talentsForCrew(id);
          const ownedCount = list.filter((t) => state.talentsOwned.includes(t.id)).length;
          return {
            value: id,
            label: `${id} (${ownedCount}/${list.length})`,
          };
        })}
      />

      <div key={crew} className="panel beat-swap space-y-3 p-3.5">
        <div className="flex items-center gap-3">
          <CastPatch id={CREW_PATCH[crew]} size={44} />
          <div className="min-w-0 flex-1">
            <h4 className="display text-[1.15rem] leading-tight text-ink">{crew}</h4>
            <p className="text-xs font-bold text-ink-soft">{role.role}</p>
          </div>
          {columnLocked && (
            <span className="well inline-flex items-center gap-1 px-2 py-1 text-[0.72rem] font-extrabold text-ink-soft">
              <LockIcon size={12} />
              Tier {columnMinTier}
            </span>
          )}
        </div>

        {/* Vertical Ski-Run Progression Track */}
        <ol className="relative space-y-2.5">
          {talents.map((talent, index) => {
            const tier = talentRequiresTier(talent.id);
            const prevTier = index > 0 ? talentRequiresTier(talents[index - 1]!.id) : 1;
            const showGate = tier > prevTier;
            const owned = state.talentsOwned.includes(talent.id);
            const open = canUnlockTalent(state, talent.id);
            const block = talentBlockReason(state, talent.id);
            const selected = activeId === talent.id;
            const justUnlocked = !reduceMotion && flashId === talent.id;

            return (
              <li key={talent.id} className="space-y-2">
                {showGate && (
                  <div className="flex items-center gap-2 pt-1">
                    <span className="h-[2px] flex-1 bg-snow-2" />
                    <span className="well inline-flex items-center gap-1 px-2 py-0.5 text-[0.7rem] font-extrabold text-ink-soft">
                      {state.lodgeTier < tier && <LockIcon size={11} />}
                      {LODGE_TIERS[tier as 1 | 2 | 3].label}
                    </span>
                    <span className="h-[2px] flex-1 bg-snow-2" />
                  </div>
                )}

                <div className="relative flex items-stretch gap-2.5">
                  {/* Track connector line */}
                  {index < talents.length - 1 && (
                    <span
                      aria-hidden="true"
                      className="absolute left-[13px] top-8 -bottom-3 w-[3px] bg-ink/25"
                    />
                  )}
                  <span
                    aria-hidden="true"
                    className={`relative z-10 mt-3 flex size-7 shrink-0 items-center justify-center rounded-full border-2 border-ink ${
                      owned
                        ? "bg-sign-green text-white"
                        : open
                          ? "bg-sign-yellow text-ink"
                          : "bg-snow-2 text-ink-soft"
                    }`}
                  >
                    {owned ? (
                      <CheckIcon size={14} />
                    ) : open ? (
                      <span className="size-2 rounded-full bg-ink" />
                    ) : (
                      <LockIcon size={12} />
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => setPickedId(talent.id)}
                    aria-pressed={selected}
                    className={`press-scale flex min-h-12 flex-1 items-center justify-between gap-2 rounded-[var(--r-chip)] border-2 border-ink px-3 py-2 text-left transition-colors duration-150 ${
                      owned
                        ? "bg-sign-green text-white"
                        : open
                          ? "bg-white text-ink shadow-[0_2px_0_var(--ink)]"
                          : "bg-snow-2 text-ink-soft"
                    } ${selected ? "ring-2 ring-[var(--sign-yellow)] ring-offset-1" : ""} ${
                      justUnlocked ? "arrive" : ""
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className="block text-[0.88rem] font-extrabold leading-snug">
                        {talent.name}
                      </span>
                      <span
                        className={`mt-0.5 block line-clamp-1 text-[0.72rem] font-bold ${
                          owned ? "text-sign-green-ink" : "text-ink-soft"
                        }`}
                      >
                        {talent.effect}
                      </span>
                    </div>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[0.68rem] font-extrabold ${
                        owned
                          ? "bg-white/20 text-white"
                          : open
                            ? "bg-sign-yellow text-ink"
                            : "text-ink-soft"
                      }`}
                    >
                      {owned ? "Active" : open ? "Ready" : blockLabel(block, talent, tier)}
                    </span>
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      <StickyInspectBar
        talentId={activeId}
        onUnlocked={(id) => {
          if (!reduceMotion) setFlashId(id);
          setPickedId(id);
        }}
      />
    </section>
  );
}
