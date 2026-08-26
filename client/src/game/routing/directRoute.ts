export type DirectRouteScreen = "landing" | "identity" | "lobby" | "maps" | "home" | "game";

const supportedScreens = new Set<DirectRouteScreen>(["landing", "identity", "lobby", "maps", "home", "game"]);

/** Only the Obsidian Frontier vertical slice is playable until it is explicitly approved. */
export const RUNTIME_MAP_ID = "obsidian-frontier";

export function isRuntimeMapAllowed(mapId: string) {
  return mapId === RUNTIME_MAP_ID;
}

/** `route` is the durable direct-entry contract; `demo` remains supported for existing review URLs. */
export function resolveDirectRoute(search: string): DirectRouteScreen {
  const params = new URLSearchParams(search);
  const requested = params.get("route") ?? params.get("demo");
  return requested && supportedScreens.has(requested as DirectRouteScreen) ? requested as DirectRouteScreen : "landing";
}

export function resolveDirectMapId(search: string, availableMapIds: readonly string[], fallback = RUNTIME_MAP_ID) {
  const safeFallback = availableMapIds.includes(RUNTIME_MAP_ID) ? RUNTIME_MAP_ID : fallback;
  const requested = new URLSearchParams(search).get("map");
  return requested && availableMapIds.includes(requested) && isRuntimeMapAllowed(requested) ? requested : safeFallback;
}
