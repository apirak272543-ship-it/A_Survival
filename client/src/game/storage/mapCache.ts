import type { MapDefinition } from "@/game/data/maps";

const CACHE_NAME = "arcane-frontier-map-modules-v2";

function cacheKey(mapId: string) {
  return `/offline-map-modules/${encodeURIComponent(mapId)}.json`;
}

export async function cacheMapModule(map: MapDefinition) {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify({ id: map.id, name: map.name, cachedAt: Date.now(), keyArt: map.keyArt, content: map.content });
  if ("caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(cacheKey(map.id), new Response(payload, { headers: { "Content-Type": "application/json" } }));
    if (map.keyArt) {
      try {
        const keyArtResponse = await fetch(map.keyArt, { cache: "no-store" });
        if (keyArtResponse.ok) await cache.put(map.keyArt, keyArtResponse.clone());
      } catch {
        // The module metadata is still available offline even if an image transfer was interrupted.
      }
    }
  }
  try {
    localStorage.setItem(`arcane-frontier.map-cache.${map.id}`, "ready");
  } catch {
    // Cache Storage remains the source of truth when localStorage is unavailable.
  }
}

export async function hasCachedMapModule(mapId: string) {
  if (typeof window === "undefined") return false;
  if ("caches" in window) {
    const cache = await caches.open(CACHE_NAME);
    if (await cache.match(cacheKey(mapId))) return true;
  }
  try {
    return localStorage.getItem(`arcane-frontier.map-cache.${mapId}`) === "ready";
  } catch {
    return false;
  }
}

export async function getCachedMapIds(mapIds: string[]) {
  const checks = await Promise.all(mapIds.map(async mapId => (await hasCachedMapModule(mapId)) ? mapId : null));
  return checks.filter((mapId): mapId is string => Boolean(mapId));
}
