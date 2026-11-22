"use client";

import { create } from "zustand";
import { useGameStore } from "@/game/store";

export const OFFICE_TABS = ["Desk", "Money", "Stats", "Reports", "Crew", "Atlas"] as const;
export type OfficeTabId = (typeof OFFICE_TABS)[number];

type OfficeUi = {
  open: boolean;
  tab: OfficeTabId;
  /** True when the day was running at the moment the Office opened, so closing resumes it. */
  resumeOnClose: boolean;
};

/** Session-only Office state. Nothing here is saved with the hill. */
export const useOffice = create<OfficeUi>(() => ({ open: false, tab: "Desk", resumeOnClose: false }));

/** Opens the Office and pauses a running day. Opening while it is already open changes nothing. */
export function openOffice(tab?: OfficeTabId): void {
  const ui = useOffice.getState();
  if (ui.open) {
    if (tab) useOffice.setState({ tab });
    return;
  }
  const game = useGameStore.getState();
  if (game.phase === "setup") return;
  const running = game.phase === "day" && !game.paused;
  if (running) game.togglePause();
  useOffice.setState({ open: true, tab: tab ?? ui.tab, resumeOnClose: running });
}

/** Closes the Office and resumes the day only if it was running when the Office opened. */
export function closeOffice(): void {
  const { open, resumeOnClose } = useOffice.getState();
  if (!open) return;
  useOffice.setState({ open: false, resumeOnClose: false });
  const game = useGameStore.getState();
  if (resumeOnClose && game.phase === "day" && game.paused) game.togglePause();
}

export function setOfficeTab(tab: OfficeTabId): void {
  useOffice.setState({ tab });
}
