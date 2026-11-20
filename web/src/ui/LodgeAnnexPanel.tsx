"use client";

import { ASSET_CATALOG, ATTACH_BONUS, lodgeAttachPads, type AssetId } from "@/game/base";
import { constructionDraw } from "@/game/economy";
import { formatMoney } from "@/game/format";
import { useGameStore } from "@/game/store";
import { venueName } from "@/game/assetNames";
import { startLodgePadPlacement } from "@/ui/placementDraft";
const BASE_ATTACH: AssetId[] = ["warming_hut", "cafe", "shop", "rentals", "ski_school"];

function padLabel(index: number): string {
  const side = index % 2 === 0 ? "west" : "east";
  const row = index < 2 ? "front" : index < 4 ? "side" : "upper";
  return `Pad ${index + 1} (${side} ${row})`;
}

export function LodgeAnnexPanel({ onCloseInspector }: { onCloseInspector: () => void }) {
  const state = useGameStore();
  const pads = lodgeAttachPads(state.lodgeTier);
  const used = new Map(state.assets.flatMap((a, i) => a.attachPad !== undefined ? [[a.attachPad, i] as const] : []));

  const begin = (asset: AssetId, padIndex: number) => {
    if (used.has(padIndex)) return;
    if (state.lodgeTier < ASSET_CATALOG[asset].opensAtTier) return;
    onCloseInspector();
    startLodgePadPlacement(asset, padIndex);
  };

  return (
    <section className="panel mt-3 space-y-2 p-3" aria-label="Lodge annex pads">
      <p className="text-sm font-bold leading-snug">
        Attach venues on lodge pads for +{Math.round(ATTACH_BONUS * 100)}% revenue and effects. Pick a pad, then confirm build.
      </p>
      <ul className="space-y-2">
        {pads.map((_, padIndex) => {
          const occupant = used.get(padIndex);
          const venue = occupant !== undefined ? state.assets[occupant] : null;
          return (
            <li key={padIndex} className="rounded-key border-2 border-ink/15 bg-snow-2 px-2 py-1.5">
              <p className="text-xs font-extrabold">{padLabel(padIndex)}</p>
              {venue ? (
                <p className="text-sm font-bold">{venueName(venue)} · annex</p>
              ) : (
                <div className="mt-1 flex flex-wrap gap-1">
                  {BASE_ATTACH.map((id) => {
                    const spec = ASSET_CATALOG[id];
                    const locked = state.lodgeTier < spec.opensAtTier;
                    return (
                      <button
                        key={id}
                        type="button"
                        disabled={locked}
                        className="key press min-h-9 px-2 text-xs font-extrabold"
                        onClick={() => begin(id, padIndex)}
                      >
                        {spec.label}
                        <span className="block text-[0.65rem] font-bold opacity-80">
                          {locked ? `Tier ${spec.opensAtTier}` : formatMoney(constructionDraw(spec.cost).deposit)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}