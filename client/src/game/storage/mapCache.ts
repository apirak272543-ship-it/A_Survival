import { MAP_REGISTRY, type MapDefinition } from "@/game/data/maps";
import { isRuntimeMapAllowed } from "@/game/routing/directRoute";

export const MAP_CACHE_NAME = "arcane-frontier-map-modules-v3" as const;

export type MapPreparationUpdate = {
  progress: number;
  phase: string;
  cached: boolean;
  offline: boolean;
};

export type MapPreparationResult = {
  cached: boolean;
  offline: boolean;
  ready: boolean;
};

function cacheKey(mapId: string) {
  return `/offline-map-modules/${encodeURIComponent(mapId)}.json`;
}

function isValidCachedMapPayload(payload: unknown, map: MapDefinition) {
  if (!payload || typeof payload !== "object") return false;
  const record = payload as { id?: unknown; name?: unknown; cachedAt?: unknown; keyArt?: unknown; content?: unknown };
  return record.id === map.id
    && record.name === map.name
    && (record.keyArt ?? undefined) === (map.keyArt ?? undefined)
    && Number.isFinite(record.cachedAt)
    && Number(record.cachedAt) > 0
    && JSON.stringify(record.content) === JSON.stringify(map.content);
}

async function hasValidCachedMapResponse(map: MapDefinition) {
  if (typeof window === "undefined" || !isRuntimeMapAllowed(map.id) || !("caches" in window)) return false;
  try {
    const cache = await caches.open(MAP_CACHE_NAME);
    const response = await cache.match(cacheKey(map.id));
    if (!response) return false;
    return isValidCachedMapPayload(await response.clone().json(), map);
  } catch {
    return false;
  }
}

export async function prepareMapModule(map: MapDefinition, onProgress?: (update: MapPreparationUpdate) => void) {
  if (typeof window === "undefined") return { cached: false, offline: false, ready: false } satisfies MapPreparationResult;
  const offline = navigator.onLine === false;
  if (!isRuntimeMapAllowed(map.id)) {
    onProgress?.({ progress: 100, phase: "แผนที่นี้ยังปิดใน runtime", cached: false, offline });
    return { cached: false, offline, ready: false } satisfies MapPreparationResult;
  }
  const alreadyCached = await hasCachedMapModule(map.id, map);
  onProgress?.({ progress: alreadyCached ? 18 : 4, phase: alreadyCached ? "อ่านโมดูลที่บันทึกไว้" : "กำลังจัดเตรียม map module", cached: alreadyCached, offline });
  if (offline && !alreadyCached) {
    onProgress?.({ progress: 38, phase: "ออฟไลน์: แผนที่ยังไม่พร้อม", cached: false, offline: true });
    return { cached: false, offline: true, ready: false } satisfies MapPreparationResult;
  }
  const payload = JSON.stringify({ id: map.id, name: map.name, cachedAt: Date.now(), keyArt: map.keyArt, content: map.content });
  if ("caches" in window) {
    const cache = await caches.open(MAP_CACHE_NAME);
    if (!alreadyCached) {
      await cache.put(cacheKey(map.id), new Response(payload, { headers: { "Content-Type": "application/json" } }));
      onProgress?.({ progress: 42, phase: "บันทึกข้อมูล expedition", cached: false, offline: false });
    }
    if (map.keyArt) {
      try {
        const existingAsset = await cache.match(map.keyArt);
        if (existingAsset) {
          onProgress?.({ progress: 78, phase: "ยืนยัน key art จาก cache", cached: true, offline });
        } else if (!offline) {
          onProgress?.({ progress: 64, phase: "ดาวน์โหลด key art ของ biome", cached: false, offline });
          const keyArtResponse = await fetch(map.keyArt, { cache: "no-store" });
          if (keyArtResponse.ok) await cache.put(map.keyArt, keyArtResponse.clone());
          onProgress?.({ progress: 88, phase: "ตรวจ asset ของ biome", cached: false, offline });
        } else {
          onProgress?.({ progress: 78, phase: "ออฟไลน์: ใช้ metadata ที่มี", cached: false, offline });
        }
      } catch {
        onProgress?.({ progress: 78, phase: "asset ไม่พร้อม: ใช้ expedition cache", cached: alreadyCached, offline });
      }
    }
  }
  try {
    localStorage.setItem(`arcane-frontier.map-cache.${map.id}`, "ready");
  } catch {
    // Cache Storage remains the source of truth when localStorage is unavailable.
  }
  onProgress?.({ progress: 100, phase: offline ? "พร้อมเปิดแบบออฟไลน์" : "พร้อมเปิด expedition", cached: alreadyCached, offline });
  return { cached: alreadyCached, offline, ready: true } satisfies MapPreparationResult;
}

export async function cacheMapModule(map: MapDefinition) {
  await prepareMapModule(map);
}

export async function hasCachedMapModule(mapId: string, expectedMap?: MapDefinition) {
  if (typeof window === "undefined" || !isRuntimeMapAllowed(mapId)) return false;
  const map = expectedMap ?? MAP_REGISTRY.find(candidate => candidate.id === mapId);
  if (!map || map.id !== mapId) return false;
  return hasValidCachedMapResponse(map);
}

export async function getCachedMapIds(mapIds: string[]) {
  const checks = await Promise.all(mapIds.map(async mapId => {
    const map = MAP_REGISTRY.find(candidate => candidate.id === mapId);
    return (map && await hasCachedMapModule(mapId, map)) ? mapId : null;
  }));
  return checks.filter((mapId): mapId is string => Boolean(mapId));
}
