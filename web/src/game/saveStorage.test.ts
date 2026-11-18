import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialState, SAVE_KEY, SAVE_VERSION, toPersisted } from "./state";
import { useGameStore } from "./store";

const BACKUP_KEY = `${SAVE_KEY}-backup`;

describe("browser save storage", () => {
  let data: Map<string, string>;
  let write: ReturnType<typeof vi.fn<(key: string, value: string) => void>>;
  beforeEach(async () => {
    data = new Map();
    write = vi.fn((key: string, value: string) => void data.set(key, value));
    vi.stubGlobal("localStorage", {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: write,
      removeItem: (key: string) => void data.delete(key),
    });
    useGameStore.getState().dismissSaveNotice();
    data.clear();
    write.mockClear();
  });
  afterEach(() => vi.unstubAllGlobals());

  it.each([
    ["malformed JSON", "{save"],
    ["newer version", JSON.stringify({ state: toPersisted(createInitialState()), version: SAVE_VERSION + 1 })],
    ["corrupt current save", JSON.stringify({ state: { ...toPersisted(createInitialState()), guests: [null] }, version: SAVE_VERSION })],
  ])("backs up %s verbatim before replacing it and exposes a session notice", async (_, raw) => {
    data.set(SAVE_KEY, raw);
    await useGameStore.persist.rehydrate();

    expect(write.mock.calls[0]).toEqual([BACKUP_KEY, raw]);
    expect(write.mock.calls[1]?.[0]).toBe(SAVE_KEY);
    expect(useGameStore.getState()).toMatchObject({ phase: "setup", saveNotice: expect.any(String) });
    expect(JSON.parse(data.get(SAVE_KEY)!).state).not.toHaveProperty("saveNotice");

    useGameStore.getState().dismissSaveNotice();
    await useGameStore.persist.rehydrate();
    expect(useGameStore.getState().saveNotice).toBeNull();
    expect(data.get(BACKUP_KEY)).toBe(raw);
  });

  it("erases only M2 keys on startup and resumes a current lodge-only save", async () => {
    const saved = { ...toPersisted(createInitialState()), cash: 9160, founderId: "riley", phase: "day" };
    const serialized = JSON.stringify({ state: saved, version: SAVE_VERSION });
    data.set("last-chair-v1", "old save");
    data.set("last-chair-v1-backup", "old backup");
    data.set("unrelated", "keep");
    data.set(SAVE_KEY, serialized);

    vi.resetModules();
    const { useGameStore: freshStore } = await import("./store");
    expect(freshStore.getState()).toMatchObject({ ...saved, saveNotice: null });
    expect(data.get(SAVE_KEY)).toBe(serialized);
    expect(data.get("unrelated")).toBe("keep");
    expect(data.has("last-chair-v1")).toBe(false);
    expect(data.has("last-chair-v1-backup")).toBe(false);
  });

  it("keeps the unreadable save if the backup cannot be written", async () => {
    data.set(SAVE_KEY, "{broken");
    write.mockImplementation(() => { throw new Error("quota"); });
    await useGameStore.persist.rehydrate();
    expect(useGameStore.persist.hasHydrated()).toBe(true);
    expect(useGameStore.getState().phase).toBe("setup");
    expect(data.get(SAVE_KEY)).toBe("{broken");

    write.mockImplementation((key, value) => void data.set(key, value));
    useGameStore.getState().dismissSaveNotice();
    expect(data.get(BACKUP_KEY)).toBe("{broken");
    expect(JSON.parse(data.get(SAVE_KEY)!).version).toBe(SAVE_VERSION);
  });
});
