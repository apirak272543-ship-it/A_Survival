import { describe, expect, it } from "vitest";
import { ACTIVE_RUNTIME_MAP_ID, buildOfflineCacheKey, evaluateOfflineCacheNamespace } from "./offlineCacheNamespaceContract";

describe("offline cache namespace contract", () => {
  it("allows active map cache preparation and deterministic cache key", () => {
    const result = evaluateOfflineCacheNamespace({ mapId: ACTIVE_RUNTIME_MAP_ID, operation: "prepare", online: true, cached: false });

    expect(result).toEqual({
      contractVersion: "offline-cache-namespace.v1",
      valid: true,
      ready: true,
      issues: [],
      mapId: "obsidian-frontier",
      cacheKey: "/offline-map-modules/obsidian-frontier.json",
      policy: { runtimeImportAllowed: true, playerVisible: true, cacheable: true, offlineWriteAllowed: true, operation: "prepare" },
    });
    expect(buildOfflineCacheKey("obsidian-frontier")).toBe("/offline-map-modules/obsidian-frontier.json");
  });

  it("allows offline read only when the active map is already cached", () => {
    const cached = evaluateOfflineCacheNamespace({ mapId: ACTIVE_RUNTIME_MAP_ID, operation: "read", online: false, cached: true });
    const missing = evaluateOfflineCacheNamespace({ mapId: ACTIVE_RUNTIME_MAP_ID, operation: "read", online: false, cached: false });

    expect(cached).toMatchObject({ valid: true, ready: true, policy: { runtimeImportAllowed: true, cacheable: true } });
    expect(missing).toMatchObject({ valid: false, ready: false, issues: ["offline map is not ready without an existing cache entry"] });
  });

  it("fails closed for future/unknown map cache and offline writes", () => {
    const result = evaluateOfflineCacheNamespace({ mapId: "map-002-ashen-obsidian-plains", operation: "write-offline-state", online: true, cached: true });

    expect(result).toMatchObject({ valid: false, ready: false, cacheKey: null, policy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false, offlineWriteAllowed: false, operation: "write-offline-state" } });
    expect(result.issues).toEqual(expect.arrayContaining(["future or unknown map is not cache-eligible", "future or unknown map cannot receive offline state writes"]));
  });

  it("rejects empty map IDs without throwing and keeps the policy deterministic", () => {
    const first = evaluateOfflineCacheNamespace({ mapId: "", operation: "read", online: false, cached: false });
    const second = evaluateOfflineCacheNamespace({ mapId: "", operation: "read", online: false, cached: false });

    expect(second).toEqual(first);
    expect(first.valid).toBe(false);
    expect(first.ready).toBe(false);
    expect(first.cacheKey).toBeNull();
    expect(first.issues).toEqual(expect.arrayContaining(["mapId must not be empty", "future or unknown map is not cache-eligible"]));
  });
});
