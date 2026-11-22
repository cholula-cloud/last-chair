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
import { SegmentedControl } from "@/ui/kit/SegmentedControl";
import { useReducedMotion } from "@/ui/motion";

const CREW_ORDER: CrewMember[] = ["Frank", "Dana", "Elena"];

const NODE_W = 148;
const NODE_H = 56;
const RANK_GAP = 72;
const ZIG = 44;
const PAD_X = 24;
const PAD_Y = 16;

function blockLabel(
  block: ReturnType<typeof talentBlockReason>,
  talent: (typeof CREW_TALENTS)[number],
  tier: number,
): string {
  if (block === "column") return `Needs ${LODGE_TIERS[CREW_COLUMN_MIN_TIER[talent.crew]].label}`;
  if (block === "lodge") return `Needs ${LODGE_TIERS[tier as 1 | 2 | 3].label}`;
  if (block === "prerequisite") return "Needs skill above";
  if (block === "points") return "Need a crew point";
  return "Locked";
}

function nodeCenter(i: number) {
  const mid = PAD_X + NODE_W / 2 + ZIG;
  const ox = (i % 2 === 0 ? -1 : 1) * ZIG;
  return {
    x: mid + ox,
    y: PAD_Y + NODE_H / 2 + i * RANK_GAP,
  };
}

function treeSize(count: number) {
  return {
    width: PAD_X * 2 + NODE_W + ZIG * 2,
    height: PAD_Y * 2 + NODE_H + Math.max(0, count - 1) * RANK_GAP,
  };
}

function TalentNode({
  talentId,
  selected,
  onSelect,
  justUnlocked,
}: {
  talentId: TalentId;
  selected: boolean;
  onSelect: () => void;
  justUnlocked: boolean;
}) {
  const state = useGameStore();
  const talent = CREW_TALENTS.find((t) => t.id === talentId)!;
  const owned = state.talentsOwned.includes(talent.id);
  const open = canUnlockTalent(state, talent.id);
  const block = talentBlockReason(state, talent.id);
  const status = owned
    ? "Active"
    : open
      ? "Ready"
      : blockLabel(block, talent, talentRequiresTier(talent.id));

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={`flex h-full w-full flex-col justify-center rounded-[var(--r-chip)] border-2 border-ink px-2.5 text-left ${
        owned
          ? "bg-sign-green text-white"
          : open
            ? "bg-white shadow-[0_3px_0_var(--ink)]"
            : "bg-snow-2 text-ink-soft"
      } ${selected ? "ring-2 ring-[var(--sign-yellow)] ring-offset-1" : ""} ${
        justUnlocked ? "arrive" : ""
      }`}
    >
      <span className={`text-[0.8rem] font-extrabold leading-snug ${owned ? "text-white" : "text-ink"}`}>
        {talent.name}
      </span>
      <span className={`mt-0.5 text-[0.65rem] font-bold ${owned ? "text-sign-green-ink" : "text-ink-soft"}`}>
        {status}
      </span>
    </button>
  );
}

function TalentDetail({
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
    <div className="panel space-y-2 px-3 py-2.5">
      <p className="text-sm font-extrabold leading-snug">{talent.name}</p>
      <p className="text-xs font-bold leading-snug text-ink-soft">{talent.effect}</p>
      {owned ? (
        need ? (
          <span className="inline-flex min-h-8 items-center rounded-full border-2 border-ink bg-gold px-2.5 text-[0.7rem] font-extrabold">
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
          onClick={() => {
            state.pickCrewTalent(talent.id);
            onUnlocked(talent.id);
          }}
          className="key press flex min-h-11 w-full items-center justify-center px-2 text-sm font-extrabold"
        >
          Unlock ({CREW_POINT_COST} pt)
        </button>
      ) : (
        <span className="inline-flex min-h-8 items-center rounded-full border-2 border-ink bg-snow-2 px-2.5 text-[0.7rem] font-extrabold text-ink-soft">
          {blockLabel(block, talent, tier)}
        </span>
      )}
    </div>
  );
}

function ZigzagBranch({
  crew,
  selectedId,
  onSelect,
  flashId,
}: {
  crew: CrewMember;
  selectedId: TalentId | null;
  onSelect: (id: TalentId) => void;
  flashId: TalentId | null;
}) {
  const talents = useMemo(() => talentsForCrew(crew), [crew]);
  const size = treeSize(talents.length);
  const centers = talents.map((_, i) => nodeCenter(i));

  return (
    <div className="relative mx-auto" style={{ width: size.width, height: size.height }}>
      <svg
        width={size.width}
        height={size.height}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        {centers.slice(1).map((c, i) => {
          const a = centers[i]!;
          const midY = (a.y + c.y) / 2;
          return (
            <path
              key={talents[i + 1]!.id}
              d={`M ${a.x} ${a.y + NODE_H / 2 - 4} C ${a.x} ${midY}, ${c.x} ${midY}, ${c.x} ${c.y - NODE_H / 2 + 4}`}
              fill="none"
              stroke="var(--ink)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
      </svg>
      {talents.map((talent, i) => {
        const c = centers[i]!;
        return (
          <div
            key={talent.id}
            className="absolute"
            style={{
              left: c.x - NODE_W / 2,
              top: c.y - NODE_H / 2,
              width: NODE_W,
              height: NODE_H,
            }}
          >
            <TalentNode
              talentId={talent.id}
              selected={selectedId === talent.id}
              onSelect={() => onSelect(talent.id)}
              justUnlocked={flashId === talent.id}
            />
          </div>
        );
      })}
    </div>
  );
}

export function TalentTreePanel() {
  const state = useGameStore();
  const reduceMotion = useReducedMotion();
  const [crew, setCrew] = useState<CrewMember>("Frank");
  const [selectedId, setSelectedId] = useState<TalentId | null>(null);
  const [flashId, setFlashId] = useState<TalentId | null>(null);

  const role = CREW_ROLES[crew];
  const columnLocked = state.lodgeTier < CREW_COLUMN_MIN_TIER[crew];

  return (
    <section className="space-y-3" aria-label="Talent tree">
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip bg-gold px-2.5 py-1 text-sm font-extrabold tabular-nums">
          {state.crewPoints} {state.crewPoints === 1 ? "point" : "points"}
        </span>
        <p className="text-xs font-bold leading-snug text-ink-soft">
          One point most nights. Deepen a track or spread out.
        </p>
      </div>

      <SegmentedControl
        ariaLabel="Crew member"
        value={crew}
        onChange={(next) => {
          setCrew(next);
          setSelectedId(null);
        }}
        options={CREW_ORDER.map((id) => ({ value: id, label: id }))}
      />

      <div className="panel space-y-3 p-3">
        <div className="flex items-start gap-3">
          <div
            className="flex size-11 shrink-0 items-center justify-center rounded-[var(--r-chip)] border-2 border-ink bg-snow-2 text-lg font-extrabold"
            aria-hidden
          >
            {crew[0]}
          </div>
          <div className="min-w-0">
            <h4 className="text-sm font-extrabold text-ink">{crew}</h4>
            <p className="text-xs font-bold text-ink-soft">{role.role}</p>
            {columnLocked && (
              <p className="mt-1 text-xs font-bold text-ink-soft">
                Opens at {LODGE_TIERS[CREW_COLUMN_MIN_TIER[crew]].label}
              </p>
            )}
          </div>
        </div>

        <ZigzagBranch
          crew={crew}
          selectedId={selectedId}
          flashId={reduceMotion ? null : flashId}
          onSelect={setSelectedId}
        />
      </div>

      {selectedId ? (
        <TalentDetail
          talentId={selectedId}
          onUnlocked={(id) => {
            if (!reduceMotion) setFlashId(id);
            setSelectedId(id);
          }}
        />
      ) : (
        <p className="text-center text-xs font-bold text-ink-soft">Tap a skill for details.</p>
      )}
    </section>
  );
}
