"use client";

import { useState, type FormEvent } from "react";
import { assetIsPresent, cleanAssetName, liftName, lodgeName, MAX_ASSET_NAME_LENGTH, venueName, type AssetTarget } from "@/game/assetNames";
import { ASSET_CATALOG, assetEffect, assetRevenue, LODGE_TIERS } from "@/game/base";
import { formatMoney } from "@/game/format";
import { gunCoverage } from "@/game/guns";
import { isLiftOperational, liftCapacityPerHour, liftLoadingClosesAt, liftWaitMin, rideMinutesForLift } from "@/game/lifts";
import { readSnow } from "@/game/snow";
import type { GameState } from "@/game/state";
import { useGameStore } from "@/game/store";
import { DAY_START_MIN, LIFT_LABELS, SNOW_LABELS } from "@/game/types";
import { isWindHeld, weatherForDay } from "@/game/weather";
import { normalizeStyleId, unlockedBuildingStyles, type BuildingStyleId } from "@/game/styles";
import { LodgeUpgradeControl } from "./LodgeUpgradeControl";
import { LodgeAnnexPanel } from "./LodgeAnnexPanel";
import { StylePicker } from "./StylePicker";
import { Sheet } from "./kit/Sheet";

function assetDetails(state: GameState, target: AssetTarget): {
  name: string;
  type: string;
  facts: [label: string, value: string | number][];
} | null {
  if (!assetIsPresent(state, target)) return null;
  const tier = LODGE_TIERS[state.lodgeTier];
  const index = "index" in target ? target.index : -1;
  switch (target.kind) {
    case "lodge": {
      const attached = state.assets.filter((venue) => venue.attachPad !== undefined).length;
      const details = {
        name: lodgeName(state),
        type: `Lodge tier ${state.lodgeTier}`,
        facts: [["Parking spaces", tier.stalls], ["Attached venues", `${attached} / ${tier.pads}`]] as [string, string | number][],
      };
      if (state.lodgeUpgrade) {
        const { toTier, nightsRemaining } = state.lodgeUpgrade;
        details.facts.push([`Tier ${toTier} upgrade`, `${nightsRemaining} ${nightsRemaining === 1 ? "night" : "nights"} remaining`]);
      }
      return details;
    }
    case "venue": {
      const venue = state.assets[index];
      const spec = ASSET_CATALOG[venue.id];
      const seats = Math.floor(assetEffect(venue, "seats"));
      const inside = state.guests.filter((guest) => guest.state === "refuel" && guest.venueIndex === index).length;
      return {
        name: venueName(venue),
        type: venue.attachPad !== undefined ? `${spec.label} · Lodge annex` : `${spec.label} · Base venue`,
        facts: [
          ...(seats ? [["Guests inside", `${inside} / ${seats}`] as [string, string]] : []),
          ["Revenue per visit", formatMoney(assetRevenue(venue, state.founderId))],
          ["Daily upkeep", formatMoney(spec.upkeep)],
        ],
      };
    }
    case "lift": {
      const lift = state.lifts[index];
      const held = isWindHeld(lift.type, weatherForDay(state).wind, state.clockMin, state.talentsOwned);
      const status = lift.closing ? "Closing tonight"
        : !isLiftOperational(lift, index, state.trails) ? "Waiting for a trail"
        : state.clockMin >= liftLoadingClosesAt(state.talentsOwned) ? "Closed for the day"
        : held ? "Wind hold" : state.clockMin <= DAY_START_MIN && state.paused ? "Ready to open" : "Open";
      return {
        name: liftName(lift, index),
        type: LIFT_LABELS[lift.type],
        facts: [
          ["Status", status],
          ["Estimated wait", `${Math.round(liftWaitMin(lift, state.talentsOwned))} min`],
          ["Ride time", `${rideMinutesForLift(lift)} min`],
          ["Capacity / hour", Math.round(liftCapacityPerHour(lift.type, state.talentsOwned))],
          ["Rides today", state.dayStats.byLift[index]?.rides ?? 0],
        ],
      };
    }
    case "trail": {
      const trail = state.trails[index];
      const lift = state.lifts[trail.liftIndex];
      const startsFrom = trail.links?.start && state.trails[trail.links.start.trailIndex]?.name;
      const joins = trail.links?.end && state.trails[trail.links.end.trailIndex]?.name;
      const access = startsFrom || (lift?.confirmed ? liftName(lift, trail.liftIndex) : null);
      return {
        name: trail.name,
        type: `${trail.difficulty[0].toUpperCase()}${trail.difficulty.slice(1)} ${trail.glade ? "glade" : "trail"}`,
        facts: [
          ["Length", `${Math.round(trail.lengthFt).toLocaleString("en-US")} ft`],
          ["Sustained grade", `${Math.round(trail.pitch * 100)}%`],
          ["Snow", readSnow([{ confirmed: trail.open, trail: trail.snow, elevations: trail.elevations }]).label],
          ["Trail passes today", state.dayStats.runsByTrail[index] ?? 0],
          ...(access ? [["Starts from", access] as [string, string]] : []),
          ...(joins ? [["Joins", joins] as [string, string]] : []),
        ],
      };
    }
    case "gun": {
      const gun = state.guns[index];
      const trails = state.trails.filter((trail) => trail.open && gunCoverage(trail, [gun], state.talentsOwned).some(Boolean));
      return {
        name: gun.name ?? `Snow gun ${index + 1}`,
        type: "Snow gun",
        facts: [
          ["Trails in reach", trails.map((trail) => trail.name).join(", ") || "None"],
          ["Placed", `Day ${gun.builtDay}`],
          ["Daily upkeep", formatMoney(ASSET_CATALOG.snow_guns.upkeep)],
        ],
      };
    }
    case "parking":
      return {
        name: "Parking lot",
        type: "Base area",
        facts: [["Parking spaces", tier.stalls], ["Arrivals today", state.dayStats.guestsArrived]],
      };
    case "snowcat":
      return {
        name: "Snowcat",
        type: "Grooming vehicle",
        facts: [["Tonight’s snow and service", SNOW_LABELS[state.pendingSnow]]],
      };
  }
}

export function AssetInspector({ target, onClose }: {
  target: AssetTarget;
  onClose: () => void;
}) {
  const state = useGameStore();
  const setLodgeStyle = useGameStore((s) => s.setLodgeStyle);
  const setAssetStyle = useGameStore((s) => s.setAssetStyle);
  const styleChoices = unlockedBuildingStyles(state);
  const details = assetDetails(state, target);
  const [draft, setDraft] = useState(() => details?.name ?? "");
  const [saved, setSaved] = useState(false);
  if (!details) return null;
  const canRename = target.kind !== "parking" && target.kind !== "snowcat";
  const name = cleanAssetName(draft);
  const submitName = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name || name === details.name) return;
    state.renameAsset(target, name);
    setDraft(name);
    setSaved(true);
  };

  return (
    <Sheet title={<span className="break-words">{details.name}</span>} subtitle={details.type}
      modal compact focusClose onClose={onClose} closeLabel="Close asset details" dataMarker="asset-inspector">
      <dl className="panel grid grid-cols-1 gap-y-0 p-3 text-sm sm:grid-cols-2 sm:gap-x-3 sm:gap-y-2">
        {details.facts.map(([label, value]) => {
          const trailNames =
            target.kind === "gun" && label === "Trails in reach" && value !== "None"
              ? String(value).split(", ")
              : null;
          return (
            <div
              key={label}
              className={`flex justify-between gap-2 border-b border-snow-2 py-1.5 last:border-b-0 sm:block sm:border-b-0 sm:py-0${trailNames ? " sm:col-span-2" : ""}`}
            >
              <dt className="font-bold text-ink-soft">{label}</dt>
              {trailNames ? (
                <dd className="mt-1 sm:mt-1.5">
                  <ul className="flex flex-wrap gap-1">
                    {trailNames.map((name) => (
                      <li key={name} className="chip px-1.5 py-0.5 text-xs font-extrabold [--lift:2px]">
                        {name}
                      </li>
                    ))}
                  </ul>
                </dd>
              ) : (
                <dd className="break-words text-right font-extrabold tabular-nums sm:text-left">{value}</dd>
              )}
            </div>
          );
        })}
      </dl>
      {canRename && (
        <form onSubmit={submitName} className="mt-3">
          <label htmlFor="asset-name" className="text-sm font-bold">Name</label>
          <div className="mt-1 flex items-stretch gap-2">
            <input id="asset-name" value={draft} maxLength={MAX_ASSET_NAME_LENGTH * 2}
              className="min-h-11 min-w-0 flex-1 rounded-key border-2 border-ink bg-white px-3 text-base font-bold"
              onChange={(event) => {
                setDraft(Array.from(event.target.value).slice(0, MAX_ASSET_NAME_LENGTH).join(""));
                setSaved(false);
              }} />
            <button type="submit" className="key press min-h-11 shrink-0 px-3 font-extrabold"
              disabled={!name || details.name === name}>Save name</button>
          </div>
          <span role="status" className="sr-only">{saved ? "Name saved." : ""}</span>
        </form>
      )}
      {target.kind === "lodge" && (
        <div className="mt-3 space-y-0">
          <StylePicker
            value={normalizeStyleId(state.lodgeStyleId)}
            onChange={(styleId: BuildingStyleId) => setLodgeStyle(styleId)}
            label="Lodge look"
            allowed={styleChoices}
          />
          <LodgeAnnexPanel onCloseInspector={onClose} />
          <LodgeUpgradeControl variant="inspector" className="mt-3" />
        </div>
      )}
      {target.kind === "venue" && (
        <StylePicker
          value={normalizeStyleId(state.assets[target.index].styleId)}
          onChange={(styleId: BuildingStyleId) => setAssetStyle(target.index, styleId)}
          label="Building look"
          allowed={styleChoices}
        />
      )}
    </Sheet>
  );
}
