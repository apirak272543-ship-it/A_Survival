export type DirectRouteScreen = "landing" | "identity" | "lobby" | "maps" | "home" | "game";

const supportedScreens = new Set<DirectRouteScreen>(["landing", "identity", "lobby", "maps", "home", "game"]);

/** `route` is the durable direct-entry contract; `demo` remains supported for existing review URLs. */
export function resolveDirectRoute(search: string): DirectRouteScreen {
  const params = new URLSearchParams(search);
  const requested = params.get("route") ?? params.get("demo");
  return requested && supportedScreens.has(requested as DirectRouteScreen) ? requested as DirectRouteScreen : "landing";
}

export function resolveDirectMapId(search: string, availableMapIds: readonly string[], fallback = "obsidian-frontier") {
  const requested = new URLSearchParams(search).get("map");
  return requested && availableMapIds.includes(requested) ? requested : fallback;
}
