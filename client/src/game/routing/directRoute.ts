export type DirectRouteScreen = "landing" | "identity" | "lobby" | "maps" | "home" | "game";

const supportedScreens = new Set<DirectRouteScreen>(["landing", "identity", "lobby", "maps", "home", "game"]);

/** `route` is the durable direct-entry contract; `demo` remains supported for existing review URLs. */
export function resolveDirectRoute(search: string): DirectRouteScreen {
  const params = new URLSearchParams(search);
  const requested = params.get("route") ?? params.get("demo");
  return requested && supportedScreens.has(requested as DirectRouteScreen) ? requested as DirectRouteScreen : "landing";
}

export const RUNTIME_MAP_ID = "obsidian-frontier";

/** Only the approved vertical-slice map may be entered from a runtime URL. */
export function resolveDirectMapId(search: string, availableMapIds: readonly string[], fallback = RUNTIME_MAP_ID) {
  const requested = new URLSearchParams(search).get("map");
  return requested === RUNTIME_MAP_ID && availableMapIds.includes(requested) ? requested : fallback;
}
