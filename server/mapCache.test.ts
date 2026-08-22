import { afterEach, describe, expect, it, vi } from "vitest";
import { MAP_REGISTRY } from "../client/src/game/data/maps";
import { prepareMapModule } from "../client/src/game/storage/mapCache";

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

  it("keeps map metadata usable offline without requesting a missing key art", async () => {
    installCacheHarness(false);
    const phases: string[] = [];
    const result = await prepareMapModule(MAP_REGISTRY[1]!, update => phases.push(update.phase));
    expect(result.offline).toBe(true);
    expect(phases).toContain("ออฟไลน์: ใช้ metadata ที่มี");
    expect(globalThis.fetch).not.toHaveBeenCalled();
  });
});
