import { ASSET_CATALOG, type AssetId } from "@/game/base";
import { formatMoney } from "@/game/format";
import type { RevenueBreakdown } from "@/game/officeSeries";
import type { NightRecap } from "@/game/sim";
import { PieChartSvg, type PieSlice } from "./officeCharts";

export function breakdownPieSlices(b: RevenueBreakdown): PieSlice[] {
  const items: PieSlice[] = [
    { label: "Lift tickets", value: b.tickets, color: "var(--sign-green)" },
    { label: "Base venues", value: b.venues, color: "var(--gold)", pattern: "stripe" },
    { label: "School bus", value: b.schoolBus, color: "var(--sky)", pattern: "dots" },
  ];
  return items.filter((s) => s.value > 0);
}

export function revenueMixAriaLabel(b: RevenueBreakdown): string {
  if (b.total <= 0) return "No revenue";
  const parts = breakdownPieSlices(b).map((s) => {
    const pct = Math.round((s.value / b.total) * 100);
    return `${s.label} ${pct}%`;
  });
  return `Revenue mix: ${parts.join(", ")}`;
}

export function RevenueMixDonut({ breakdown, size = 112 }: { breakdown: RevenueBreakdown; size?: number }) {
  if (breakdown.total <= 0) return null;
  return (
    <PieChartSvg
      slices={breakdownPieSlices(breakdown)}
      size={size}
      ariaLabel={revenueMixAriaLabel(breakdown)}
    />
  );
}

export function VenueRevenueList({ facts }: { facts: NightRecap["facts"] }) {
  const entries = Object.entries(facts.venueRevenue ?? {}).filter(([, amount]) => amount > 0);
  if (entries.length === 0) return null;
  return (
    <ul aria-label="Venue takings" className="mt-0.5 space-y-0.5 pl-3 text-xs font-bold text-ink-soft">
      {entries.map(([id, amount]) => (
        <li key={id}>
          {ASSET_CATALOG[id as AssetId].label} {formatMoney(amount)}
        </li>
      ))}
    </ul>
  );
}