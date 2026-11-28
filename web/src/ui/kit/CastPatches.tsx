import type { FounderId } from "@/game/types";

export type CastPatchId =
  | FounderId
  | "maris"
  | "frank"
  | "dana"
  | "sloane"
  | "dot"
  | "hank";

const PATCH_META: Record<CastPatchId, { bg: string; label: string }> = {
  elena: { bg: "#2d5a4a", label: "Elena Vargas" },
  tom: { bg: "#24313f", label: "Tom Keene" },
  riley: { bg: "#a8382b", label: "Riley Otis" },
  amira: { bg: "#2f5f9e", label: "Dr. Amira Chen" },
  juniper: { bg: "#5d6b2f", label: "Juniper Hale" },
  marco: { bg: "#7b4a8f", label: "Marco Russo" },
  maris: { bg: "#f6c700", label: "Maris Shaw" },
  frank: { bg: "#0b6b3a", label: "Frank Oka" },
  dana: { bg: "#b8302a", label: "Chief Dana Holt" },
  sloane: { bg: "#1d4ed8", label: "Sloane Prescott" },
  dot: { bg: "#7a4524", label: "Grammy Dot" },
  hank: { bg: "#2f5f9e", label: "Supt. Hank Pelletier" },
};

export function castPatchForSpeaker(from?: string | null): CastPatchId | null {
  if (!from) return null;
  const s = from.toLowerCase();
  if (s.includes("sloane") || s.includes("whiterock")) return "sloane";
  if (s.includes("maris") || s.includes("route 100") || s.includes("wvtk")) return "maris";
  if (s.includes("frank")) return "frank";
  if (s.includes("dana")) return "dana";
  if (s.includes("elena")) return "elena";
  if (s.includes("dot") || s.includes("grammy")) return "dot";
  if (s.includes("hank") || s.includes("pelletier")) return "hank";
  if (s.includes("riley")) return "riley";
  if (s.includes("tom") || s.includes("ledger")) return "tom";
  if (s.includes("amira")) return "amira";
  if (s.includes("juniper")) return "juniper";
  if (s.includes("marco")) return "marco";
  return null;
}

function PatchGlyph({ id }: { id: CastPatchId }) {
  const stroke = "#1b3a57";
  switch (id) {
    case "elena":
      // Crossed Arlberg skis + warm apple
      return (
        <>
          <path d="M12 36L36 12M12 12L36 36" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" />
          <path d="M12 36L36 12M12 12L36 36" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle cx="24" cy="26" r="6" fill="#e0483e" stroke={stroke} strokeWidth="2.5" />
          <path d="M24 20c0-3 2-4 4-4" stroke="#f6c700" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        </>
      );
    case "tom":
      // Brass ledger book + pine emblem
      return (
        <>
          <rect x="13" y="13" width="22" height="22" rx="3" fill="#ffc93c" stroke={stroke} strokeWidth="2.5" />
          <path d="M20 13v22" stroke={stroke} strokeWidth="2.5" />
          <path d="M25 20h6M25 25h6M25 30h4" stroke={stroke} strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case "riley":
      // Lift bullwheel + wrench
      return (
        <>
          <circle cx="24" cy="24" r="10.5" fill="none" stroke="#ffffff" strokeWidth="3.5" />
          <circle cx="24" cy="24" r="4" fill="#ffc93c" stroke={stroke} strokeWidth="2.2" />
          <path d="M14 24h6M28 24h6M24 14v6M24 28v6" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
        </>
      );
    case "amira":
      // Barometer dial + snow star
      return (
        <>
          <circle cx="24" cy="24" r="11" fill="#ffffff" stroke={stroke} strokeWidth="2.5" />
          <path d="M24 24l6-6" stroke="#e0483e" strokeWidth="2.8" strokeLinecap="round" />
          <circle cx="24" cy="24" r="2.5" fill={stroke} />
          <path d="M17 19h2M29 19h2M24 15v2" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        </>
      );
    case "juniper":
      // Sugar maple crest on ridge
      return (
        <>
          <path d="M24 11l3 7 6-2-2 6 5 3-7 3 1 5-6-3-6 3 1-5-7-3 5-3-2-6 6 2z" fill="#ffc93c" stroke={stroke} strokeWidth="2.2" strokeLinejoin="round" />
          <path d="M24 30v7" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        </>
      );
    case "marco":
      // Hearth flame + waffle griddle
      return (
        <>
          <rect x="13" y="25" width="22" height="10" rx="2" fill="#f8efd4" stroke={stroke} strokeWidth="2.5" />
          <path d="M18 25v10M24 25v10M30 25v10" stroke={stroke} strokeWidth="1.8" />
          <path d="M24 11c4 4 5 7 3 10 2-1 4-3 3-6 3 3 3 9-6 10-7-1-7-7-3-10 0 2 1 3 2 3-1-3 0-5 1-7z" fill="#ffc93c" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        </>
      );
    case "maris":
      // Broadcast tower inside yellow patch
      return (
        <>
          <path d="M24 14l-7 22h14z" fill="#ffffff" stroke={stroke} strokeWidth="2.5" strokeLinejoin="round" />
          <circle cx="24" cy="14" r="2.8" fill="#e0483e" stroke={stroke} strokeWidth="2" />
          <path d="M15 17a10 10 0 0 1 0-7M33 17a10 10 0 0 0 0-7" fill="none" stroke={stroke} strokeWidth="2.3" strokeLinecap="round" />
        </>
      );
    case "frank":
      // Snowcat blade + corduroy stripes
      return (
        <>
          <rect x="12" y="16" width="24" height="14" rx="3" fill="#ffc93c" stroke={stroke} strokeWidth="2.5" />
          <path d="M14 34h20M17 20h14M17 25h14" stroke={stroke} strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "dana":
      // Ski patrol cross + wind pennant
      return (
        <>
          <path d="M21 13h6v8h8v6h-8v8h-6v-8h-8v-6h8z" fill="#ffffff" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
        </>
      );
    case "sloane":
      // Sharp geometric twin-peak corporate crest
      return (
        <>
          <path d="M10 34l9-18 6 10 5-12 8 20z" fill="#ffffff" stroke={stroke} strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M15 26l4-10 4 7" fill="none" stroke="#1d4ed8" strokeWidth="2.2" strokeLinejoin="round" />
        </>
      );
    case "dot":
      // Steaming cider mug + '44 stamp
      return (
        <>
          <rect x="14" y="20" width="16" height="14" rx="3" fill="#f8efd4" stroke={stroke} strokeWidth="2.5" />
          <path d="M30 23h4a3 3 0 0 1 0 6h-4" fill="none" stroke="#f8efd4" strokeWidth="2.5" />
          <path d="M19 16c0-2 2-3 2-5M25 16c0-2 2-3 2-5" fill="none" stroke="#ffc93c" strokeWidth="2.4" strokeLinecap="round" />
        </>
      );
    case "hank":
      // Yellow school bus front silhouette
      return (
        <>
          <rect x="13" y="14" width="22" height="18" rx="4" fill="#f6c700" stroke={stroke} strokeWidth="2.5" />
          <rect x="16" y="18" width="16" height="6" rx="1.5" fill="#ffffff" stroke={stroke} strokeWidth="2" />
          <circle cx="18" cy="28" r="2" fill={stroke} />
          <circle cx="30" cy="28" r="2" fill={stroke} />
        </>
      );
  }
}

/** Woven Toy-Box SVG ski patch crest matching DESIGN.md 3px navy ink rules. */
export function CastPatch({ id, size = 44 }: { id: CastPatchId; size?: number }) {
  const meta = PATCH_META[id];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
      className="shrink-0"
    >
      <circle cx="24" cy="24" r="21" fill={meta.bg} stroke="var(--ink)" strokeWidth="3.2" />
      <circle cx="24" cy="24" r="17.5" fill="none" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="2.5 2.5" opacity="0.7" />
      <PatchGlyph id={id} />
    </svg>
  );
}
