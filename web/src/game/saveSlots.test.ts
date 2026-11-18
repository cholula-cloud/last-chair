import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  ACTIVE_SLOT_KEY,
  buildExport,
  exportFilename,
  exportFromRaw,
  firstEmptySlot,
  parseExport,
  readAllSlotSummaries,
  slotBackupKey,
  slotKey,
  summarizeRaw,
} from "./saveSlots";
import { deleteSlot, exportSlot, importIntoSlot, playSlot, startNewWinter } from "./slotActions";
import { createInitialState, SAVE_KEY, SAVE_VERSION, toPersisted } from "./state";
import {
  DAY_WRITE_INTERVAL_MS,
  flushSave,
  installSaveFlush,
  setSaveClock,
  useGameStore,
} from "./store";

const dayState = () => ({ ...toPersisted(createInitialState(7)), cash: 9160, founderId: "riley" as const, phase: "day" as const, paused: false });
const envelope = (state: unknown, extra: object = {}) => JSON.stringify({ state, version: SAVE_VERSION, ...extra });

describe("save slots", () => {
  let data: Map<string, string>;
  let write: ReturnType<typeof vi.fn<(key: string, value: string) => void>>;
  let t: number;
  beforeEach(() => {
    data = new Map();
    write = vi.fn((key: string, value: string) => void data.set(key, value));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: write,
      removeItem: (key: string) => void data.delete(key),
    });
    t = 1_000_000;
    setSaveClock(() => t);
    useGameStore.persist.setOptions({ name: slotKey(1) });
  });
  afterEach(() => {
    setSaveClock();
    vi.unstubAllGlobals();
  });

  describe("legacy save", () => {
    it("moves the single-slot save and its backup into slot 1", async () => {
      const raw = envelope(dayState());
      data.set(SAVE_KEY, raw);
      data.set(`${SAVE_KEY}-backup`, "older broken save");
      data.set("last-chair-v1", "m2");

      vi.resetModules();
      const { useGameStore: fresh } = await import("./store");

      expect(data.has(SAVE_KEY)).toBe(false);
      expect(data.has(`${SAVE_KEY}-backup`)).toBe(false);
      expect(data.get(slotKey(1))).toBe(raw);
      expect(data.get(slotBackupKey(1))).toBe("older broken save");
      expect(data.get(ACTIVE_SLOT_KEY)).toBe("1");
      expect(data.has("last-chair-v1")).toBe(false);
      expect(fresh.persist.getOptions().name).toBe(slotKey(1));
      expect(fresh.getState()).toMatchObject({ cash: 9160, phase: "day", founderId: "riley" });
    });

    it("leaves an existing slot 1 alone", async () => {
      data.set(SAVE_KEY, envelope(dayState()));
      const slotOne = envelope({ ...dayState(), cash: 5 });
      data.set(slotKey(1), slotOne);
      vi.resetModules();
      await import("./store");
      expect(data.get(slotKey(1))).toBe(slotOne);
      expect(data.has(SAVE_KEY)).toBe(true);
    });
  });

  describe("summaries", () => {
    it("reads day, season length, cash and last played time", () => {
      const state = { ...dayState(), dayIndex: 12, cash: 4321 };
      expect(summarizeRaw(envelope(state, { savedAt: 99 }))).toEqual({
        kind: "ok", mountainId: "dutch_hill", hill: "Dutch Hill", dayIndex: 12, seasonLength: 28, cash: 4321, savedAt: 99,
      });
    });

    it("reports empty and unreadable slots without throwing", () => {
      expect(summarizeRaw(null)).toEqual({ kind: "empty" });
      for (const raw of ["{nope", "null", "[]", '{"state":5}', envelope({ ...dayState(), cash: "rich" })]) {
        expect(summarizeRaw(raw)).toEqual({ kind: "unreadable" });
      }
    });

    it("finds the first empty slot", () => {
      data.set(slotKey(1), envelope(dayState()));
      expect(firstEmptySlot(readAllSlotSummaries())).toBe(2);
      data.set(slotKey(2), "x");
      data.set(slotKey(3), "x");
      expect(firstEmptySlot(readAllSlotSummaries())).toBeNull();
    });
  });

  describe("export and import", () => {
    it("round-trips to an equal state", () => {
      const state = toPersisted(createInitialState(11));
      const text = JSON.stringify(buildExport(state, SAVE_VERSION, 0));
      const parsed = parseExport(text);
      expect(parsed).toEqual({ ok: true, state });
      expect(JSON.parse(text)).toMatchObject({ app: "last-chair", format: 1, version: SAVE_VERSION, exportedAt: "1970-01-01T00:00:00.000Z" });
    });

    it("builds the file from a raw slot and names it after the hill and day", () => {
      const state = { ...dayState(), dayIndex: 12 };
      const file = exportFromRaw(envelope(state));
      expect(file && exportFilename(file)).toBe("last-chair-dutch-hill-day-12.json");
      expect(exportFromRaw("{broken")).toBeNull();
      expect(exportFromRaw(null)).toBeNull();
    });

    it.each([
      ["a different app", JSON.stringify({ ...buildExport(toPersisted(createInitialState()), SAVE_VERSION), app: "other" })],
      ["malformed JSON", "{not json"],
      ["a corrupt state", JSON.stringify(buildExport({ ...toPersisted(createInitialState()), guests: [null] } as never, SAVE_VERSION))],
      ["a newer version", JSON.stringify(buildExport(toPersisted(createInitialState()), SAVE_VERSION + 1))],
      ["a missing state", JSON.stringify({ app: "last-chair", format: 1, version: SAVE_VERSION })],
    ])("rejects %s with a message", (_, text) => {
      const result = parseExport(text);
      expect(result.ok).toBe(false);
      expect(result.ok === false && result.message.length).toBeGreaterThan(10);
    });

    it("writes a valid import into the chosen slot and refuses a bad one", () => {
      const state = { ...dayState(), dayIndex: 5 };
      const text = JSON.stringify(buildExport(state, SAVE_VERSION));
      expect(importIntoSlot(2, text)).toEqual({ ok: true });
      expect(summarizeRaw(data.get(slotKey(2)) ?? null)).toMatchObject({ kind: "ok", dayIndex: 5 });
      expect(importIntoSlot(3, "{bad").ok).toBe(false);
      expect(data.has(slotKey(3))).toBe(false);
      expect(exportSlot(2)?.state).toEqual(state);
    });
  });

  describe("write cadence", () => {
    beforeEach(async () => {
      data.set(slotKey(1), envelope(dayState()));
      await useGameStore.persist.rehydrate();
      useGameStore.getState().togglePause();
      useGameStore.getState().togglePause();
      write.mockClear();
    });

    const writesTo = () => write.mock.calls.filter(([key]) => key === slotKey(1)).length;

    it("does not write on ticks inside the ten second window", () => {
      for (let i = 0; i < 50; i++) useGameStore.getState().tick(100);
      t += DAY_WRITE_INTERVAL_MS - 1;
      useGameStore.getState().tick(100);
      expect(writesTo()).toBe(0);
    });

    it("writes once when a tick lands after the window", () => {
      useGameStore.getState().tick(100);
      t += DAY_WRITE_INTERVAL_MS;
      useGameStore.getState().tick(100);
      expect(writesTo()).toBe(1);
      useGameStore.getState().tick(100);
      expect(writesTo()).toBe(1);
      expect(JSON.parse(data.get(slotKey(1))!).savedAt).toBe(t);
    });

    it("writes straight away when the phase changes", () => {
      useGameStore.setState({ phase: "night" });
      expect(writesTo()).toBe(1);
      expect(JSON.parse(data.get(slotKey(1))!).state.phase).toBe("night");
    });

    it("writes straight away after a build or other action", () => {
      useGameStore.getState().togglePause();
      expect(writesTo()).toBe(1);
      useGameStore.getState().dismissSaveNotice();
      expect(writesTo()).toBe(2);
    });

    it("does not write for camera-only state", () => {
      useGameStore.getState().setFollowId("g1");
      useGameStore.getState().setBuildMode(true);
      expect(writesTo()).toBe(0);
    });

    it("flushes the latest state when the tab is hidden or closing", () => {
      const doc = Object.assign(new EventTarget(), { visibilityState: "visible" as DocumentVisibilityState });
      const win = new EventTarget();
      const remove = installSaveFlush(doc as never, win as never);

      useGameStore.getState().tick(100);
      doc.dispatchEvent(new Event("visibilitychange"));
      expect(writesTo()).toBe(0);
      doc.visibilityState = "hidden";
      doc.dispatchEvent(new Event("visibilitychange"));
      expect(writesTo()).toBe(1);

      useGameStore.getState().tick(100);
      win.dispatchEvent(new Event("pagehide"));
      expect(writesTo()).toBe(2);

      remove();
      useGameStore.getState().tick(100);
      win.dispatchEvent(new Event("pagehide"));
      expect(writesTo()).toBe(2);
    });

    it("exposes flushSave for leaving the hill", () => {
      useGameStore.getState().tick(100);
      expect(writesTo()).toBe(0);
      flushSave();
      expect(writesTo()).toBe(1);
      flushSave();
      expect(writesTo()).toBe(1);
    });
  });

  describe("slot actions", () => {
    it("deletes a slot and its backup", () => {
      data.set(slotKey(2), envelope(dayState()));
      data.set(slotBackupKey(2), "backup");
      data.set(slotKey(3), envelope(dayState()));
      deleteSlot(2);
      expect(data.has(slotKey(2))).toBe(false);
      expect(data.has(slotBackupKey(2))).toBe(false);
      expect(data.has(slotKey(3))).toBe(true);
      expect(readAllSlotSummaries()[1]).toEqual({ kind: "empty" });
    });

    it("leaves a fresh game in memory when the active slot is deleted", async () => {
      data.set(slotKey(1), envelope(dayState()));
      data.set(slotBackupKey(1), "backup");
      await playSlot(1);
      expect(useGameStore.getState().phase).toBe("day");
      useGameStore.getState().tick(100);

      deleteSlot(1);
      flushSave();
      expect(data.has(slotKey(1))).toBe(false);
      expect(data.has(slotBackupKey(1))).toBe(false);
      expect(useGameStore.getState()).toMatchObject({ phase: "setup", saveNotice: null });
    });

    it("starts a new winter in a chosen slot and makes it active", async () => {
      data.set(slotKey(1), envelope(dayState()));
      await playSlot(1);
      startNewWinter(2);
      expect(data.get(ACTIVE_SLOT_KEY)).toBe("2");
      expect(useGameStore.persist.getOptions().name).toBe(slotKey(2));
      expect(summarizeRaw(data.get(slotKey(2)) ?? null)).toMatchObject({ kind: "ok", dayIndex: 1, cash: 12000 });
      expect(summarizeRaw(data.get(slotKey(1)) ?? null)).toMatchObject({ kind: "ok", cash: 9160 });
      expect(useGameStore.getState().phase).toBe("setup");
    });

    it("loads a bad slot through recovery and keeps the other slots", async () => {
      data.set(slotKey(1), envelope(dayState()));
      data.set(slotKey(3), "{broken");
      await playSlot(3);
      expect(data.get(slotBackupKey(3))).toBe("{broken");
      expect(useGameStore.getState().saveNotice).toEqual(expect.any(String));
      expect(summarizeRaw(data.get(slotKey(1)) ?? null)).toMatchObject({ kind: "ok" });
    });
  });
  describe("review fixes", () => {
    it("backs up an unreadable slot before a new winter or an import replaces it", () => {
      data.set(slotKey(2), "{broken");
      startNewWinter(2);
      expect(data.get(slotBackupKey(2))).toBe("{broken");
      expect(summarizeRaw(data.get(slotKey(2)) ?? null).kind).toBe("ok");

      data.set(slotKey(3), '{"state":{"cash":1},"version":5}');
      const text = JSON.stringify(buildExport(dayState(), SAVE_VERSION));
      expect(importIntoSlot(3, text)).toEqual({ ok: true });
      expect(data.get(slotBackupKey(3))).toBe('{"state":{"cash":1},"version":5}');
    });

    it("keeps an existing backup when a readable slot is imported over", () => {
      data.set(slotKey(2), envelope(dayState()));
      data.set(slotBackupKey(2), "old backup");
      importIntoSlot(2, JSON.stringify(buildExport(dayState(), SAVE_VERSION)));
      expect(data.get(slotBackupKey(2))).toBe("old backup");
    });

    it("does not carry a recovery notice into the next slot", async () => {
      data.set(slotKey(1), "{broken");
      data.set(slotKey(2), envelope(dayState()));
      await playSlot(1);
      expect(useGameStore.getState().saveNotice).toEqual(expect.any(String));
      await playSlot(2);
      expect(useGameStore.getState().saveNotice).toBeNull();
      expect(useGameStore.getState().cash).toBe(9160);
    });

    it.each(["playSlot", "startNewWinter", "deleteSlot"] as const)("never writes pending state into the new slot (%s)", async (how) => {
      data.set(slotKey(1), envelope(dayState()));
      data.set(slotKey(2), envelope({ ...dayState(), cash: 111 }));
      await playSlot(1);
      useGameStore.getState().togglePause();
      useGameStore.getState().togglePause();
      useGameStore.getState().tick(100);
      const pendingCash = useGameStore.getState().cash;
      const before1 = data.get(slotKey(1));
      const slot2 = data.get(slotKey(2));

      if (how === "playSlot") await playSlot(2);
      else if (how === "startNewWinter") startNewWinter(2);
      else deleteSlot(1);
      flushSave();

      // The pending tick state either reached slot 1 or was dropped.
      const after1 = data.get(slotKey(1));
      if (how !== "deleteSlot") expect(JSON.parse(after1!).state.cash).toBe(pendingCash);
      else expect(after1).toBeUndefined();
      expect(before1).toBeDefined();
      if (how === "playSlot") expect(data.get(slotKey(2))).toBe(slot2);
      if (how === "startNewWinter") expect(JSON.parse(data.get(slotKey(2))!).state.phase).toBe("setup");
    });

    it("round-trips export, import and play to an equal state", async () => {
      const state = { ...dayState(), cash: 7777 };
      data.set(slotKey(1), envelope(state));
      const file = exportSlot(1);
      expect(file).not.toBeNull();
      expect(importIntoSlot(3, JSON.stringify(file))).toEqual({ ok: true });
      await playSlot(3);
      const { saveNotice, ...rest } = useGameStore.getState();
      expect(saveNotice).toBeNull();
      expect(toPersisted(rest as never)).toEqual(state);
    });

    it("treats the store's own slot as the active one when deleting", async () => {
      data.set(slotKey(2), envelope(dayState()));
      await playSlot(2);
      data.set(ACTIVE_SLOT_KEY, "1");
      deleteSlot(2);
      expect(useGameStore.getState().phase).toBe("setup");
    });
  });
});