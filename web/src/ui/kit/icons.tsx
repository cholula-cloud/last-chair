import type { ReactNode, SVGProps } from "react";

/** Line icons drawn for Last Chair (24px grid, currentColor stroke). */
function Icon({
  children,
  size = 22,
  ...rest
}: SVGProps<SVGSVGElement> & { size?: number; children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  );
}

type P = { size?: number; className?: string };

export const PlayIcon = (p: P) => (
  <Icon {...p}>
    <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />
  </Icon>
);

export const PauseIcon = (p: P) => (
  <Icon {...p}>
    <rect
      x="6.5"
      y="5.5"
      width="3.8"
      height="13"
      rx="1"
      fill="currentColor"
      stroke="none"
    />
    <rect
      x="13.7"
      y="5.5"
      width="3.8"
      height="13"
      rx="1"
      fill="currentColor"
      stroke="none"
    />
  </Icon>
);

/** Hammer for Build. */
export const BuildIcon = (p: P) => (
  <Icon {...p}>
    <path d="M13.5 6.5 4 16l3 3 9.5-9.5" />
    <path d="M12 5l3-2 6 6-2 3-3-1-3-3z" />
  </Icon>
);

/** Two skiers' heads for Guests. */
export const GuestsIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="9" cy="8" r="3" />
    <path d="M3.5 19c.8-3.2 3-5 5.5-5s4.7 1.8 5.5 5" />
    <path d="M15.5 5.3a3 3 0 1 1 0 5.4" />
    <path d="M17 14.2c1.8.5 3 2 3.5 4.8" />
  </Icon>
);

/** Crescent moon for Close hill. */
export const MoonIcon = (p: P) => (
  <Icon {...p}>
    <path d="M19.5 14.5A8 8 0 0 1 9.5 4.5a8 8 0 1 0 10 10z" />
  </Icon>
);

export const HomeIcon = (p: P) => (
  <Icon {...p}>
    <path d="M4 11 12 4l8 7" />
    <path d="M6 9.5V20h12V9.5" />
    <path d="M10 20v-5h4v5" />
  </Icon>
);

export const CloseIcon = (p: P) => (
  <Icon {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Icon>
);

/** People in a line, for lift queue. */
export const QueueIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="5" cy="7" r="1.8" />
    <circle cx="12" cy="7" r="1.8" />
    <circle cx="19" cy="7" r="1.8" />
    <path d="M3 17v-4.5a2 2 0 0 1 4 0V17M10 17v-4.5a2 2 0 0 1 4 0V17M17 17v-4.5a2 2 0 0 1 4 0V17" />
    <path d="M2 20.5h20" />
  </Icon>
);

export const SnowIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3v18M4.2 7.5l15.6 9M4.2 16.5l15.6-9" />
    <path d="M9.5 4.5 12 7l2.5-2.5M9.5 19.5 12 17l2.5 2.5" />
  </Icon>
);

/** Face whose mouth follows the mood score. */
export function MoodIcon({ mood, ...p }: P & { mood: number }) {
  const curve = mood >= 70 ? 3 : mood >= 50 ? 1.2 : -2;
  return (
    <Icon {...p}>
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="9" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <circle cx="15" cy="10" r="0.9" fill="currentColor" stroke="none" />
      <path
        d={`M8 ${14.5 - curve / 2} Q12 ${14.5 + curve} 16 ${14.5 - curve / 2}`}
      />
    </Icon>
  );
}

export const SunIcon = (p: P) => (
  <Icon {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M5.3 18.7l1.4-1.4M17.3 6.7l1.4-1.4" />
  </Icon>
);

export const SnowfallIcon = (p: P) => (
  <Icon {...p}>
    <path d="M7 14a4 4 0 0 1-.4-8A5.5 5.5 0 0 1 17 7a3.5 3.5 0 0 1 .5 7z" />
    <path
      d="M8 17.5h.01M12 19.5h.01M16 17.5h.01M10 21.5h.01M14 21.5h.01"
      strokeWidth={2.6}
    />
  </Icon>
);

export const ThawIcon = (p: P) => (
  <Icon {...p}>
    <path d="M12 3.5c3 4 5 6.8 5 9.5a5 5 0 0 1-10 0c0-2.7 2-5.5 5-9.5z" />
    <path d="M10 14.5a2 2 0 0 0 2 2" />
  </Icon>
);

export const CheckIcon = (p: P) => (
  <Icon {...p}>
    <path d="M5 12.5 10 17 19 7" />
  </Icon>
);

export const LiftIcon = (p: P) => (
  <Icon {...p}>
    <path d="M2.5 6.5 21.5 3" />
    <path d="M12 4.8V11" />
    <path d="M8 11h8v4.5a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2z" />
    <path d="M9 21h6" />
  </Icon>
);
