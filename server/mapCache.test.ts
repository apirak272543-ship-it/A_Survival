import { afterEach, describe, expect, it, vi } from "vitest";
import { MAP_REGISTRY } from "../client/src/game/data/maps";
import { hasCachedMapModule, prepareMapModule } from "../client/src/game/storage/mapCache";

type FakeCache = { match: (key: string) => Promise<Response | undefined>; put: (key: string, response: Response) => Promise<void> };

const globalRecord = globalThis as unknown as Record<string, unknown>;
const originalWindow = globalRecord.window;
const originalCaches = globalRecord.caches;
const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
const originalFetch = globalThis.fetch;

afterEach(() => {
  globalRecord.window = originalWindow;
  globalRecord.caches = originalCaches;
  if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
  else delete globalRecord.navigator;
  globalThis.fetch = originalFetch;
});

function installCacheHarness(online = true) {
  const entries = new Map<string, Response>();
  const cache: FakeCache = {
    match: async key => entries.get(key),
    put: async (key, response) => { entries.set(key, response); },
  };
  globalRecord.window = { caches: {} };
  globalRecord.caches = { open: async () => cache };
  Object.defineProperty(globalThis, "navigator", { value: { onLine: online }, configurable: true });
  globalThis.fetch = vi.fn(async () => new Response("key-art"));
}

describe("map cache preparation", () => {
  it("reports asset download phases first, then recognizes a cached map on the next preparation", async () => {
    installCacheHarness();
    const map = MAP_REGISTRY[0]!;
    const first: string[] = [];
    await prepareMapModule(map, update => first.push(update.phase));
    expect(first).toContain("ดาวน์โหลด key art ของ biome");
    expect(first.at(-1)).toBe("พร้อมเปิด expedition");

    const second: string[] = [];
    const result = await prepareMapModule(map, update => second.push(update.phase));
    expect(result.cached).toBe(true);
    expect(second).toContain("ยืนยัน key art จาก cache");
  });

  it("does not create a new map module offline when it was never cached", async () => {
    installCacheHarness(false);
    const phases: string[] = [];
    const result = await prepareMapModule(MAP_REGISTRY[0]!, update => phases.push(update.phase));
    expect(result.offline).toBe(true);
    expect(result.ready).toBe(false);
    expect(phases).toContain("ออฟไลน์: แผนที่ยังไม่พร้อม");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });

  it("opens a previously cached map offline without fetching", async () => {
    installCacheHarness(true);
    const map = MAP_REGISTRY[0]!;
    await prepareMapModule(map);
    Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
    const result = await prepareMapModule(map);
    expect(result).toMatchObject({ cached: true, offline: true, ready: true });
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("denies future map cache preparation and lookup before any cache or network work", async () => {
    installCacheHarness();
    const futureMap = MAP_REGISTRY[1]!;
    const phases: string[] = [];
    const result = await prepareMapModule(futureMap, update => phases.push(update.phase));
    expect(result).toMatchObject({ cached: false, offline: false, ready: false });
    expect(phases).toEqual(["แผนที่นี้ยังปิดใน runtime"]);
    expect(await hasCachedMapModule(futureMap.id)).toBe(false);
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
