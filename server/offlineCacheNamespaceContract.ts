export const OFFLINE_CACHE_NAMESPACE_VERSION = "offline-cache-namespace.v1" as const;
export const OFFLINE_CACHE_NAME = "arcane-frontier-map-modules-v3" as const;
export const ACTIVE_RUNTIME_MAP_ID = "obsidian-frontier" as const;

export type OfflineCacheOperation = "prepare" | "read" | "write-offline-state";

export type OfflineCacheNamespaceResult = {
  contractVersion: typeof OFFLINE_CACHE_NAMESPACE_VERSION;
  valid: boolean;
  ready: boolean;
  issues: string[];
  mapId: string;
  cacheKey: string | null;
  policy: {
    runtimeImportAllowed: boolean;
    playerVisible: boolean;
    cacheable: boolean;
    offlineWriteAllowed: boolean;
    operation: OfflineCacheOperation;
  };
};

function safeMapId(mapId: string) {
  return typeof mapId === "string" && mapId.trim().length > 0 ? mapId.trim() : "";
}

export function buildOfflineCacheKey(mapId: string) {
  const normalized = safeMapId(mapId);
  return normalized ? `/offline-map-modules/${encodeURIComponent(normalized)}.json` : null;
}

export function evaluateOfflineCacheNamespace(input: {
  mapId: string;
  operation: OfflineCacheOperation;
  online: boolean;
  cached: boolean;
}): OfflineCacheNamespaceResult {
  const mapId = safeMapId(input.mapId);
  const issues: string[] = [];
  if (!mapId) issues.push("mapId must not be empty");
  const active = mapId === ACTIVE_RUNTIME_MAP_ID;
  if (!active) issues.push("future or unknown map is not cache-eligible");
  if (input.operation === "write-offline-state" && !active) issues.push("future or unknown map cannot receive offline state writes");
  const cacheable = active;
  const offlineWriteAllowed = active;
  const ready = active && (input.online || input.cached);
  if (active && !input.online && !input.cached) issues.push("offline map is not ready without an existing cache entry");
  return {
    contractVersion: OFFLINE_CACHE_NAMESPACE_VERSION,
    valid: issues.length === 0,
    ready,
    issues,
    mapId,
    cacheKey: active ? buildOfflineCacheKey(mapId) : null,
    policy: {
      runtimeImportAllowed: active,
      playerVisible: active,
      cacheable,
      offlineWriteAllowed,
      operation: input.operation,
    },
  };
}
