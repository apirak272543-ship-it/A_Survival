export type Map012Memory = { state: "idle" | "gale-warning" | "gale-active" | "cooldown" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map012Input = { x: number; z: number; health: number; harvestedGlass: number; defeatedStalkers: number; interacted: boolean; now: number; menuOpen?: boolean };
export const MAP012_SCOUT_OVERLOOK = { x: 14, z: 12, radius: 7 };
export const MAP012_WIND_MONOLITH = { x: -26, z: -22, radius: 8 };
const period = 55000, warningDuration = 4500, galeDuration = 7000;
export const initialMap012Encounter = (): Map012Memory => ({ state: "idle", eliteRevealed: false });
export function resolveMap012Encounter(memory: Map012Memory, input: Map012Input) {
  const clock = Math.max(0, input.now) % period; const warning = clock >= period - warningDuration; const active = clock < galeDuration;
  const sheltered = Math.hypot(input.x - MAP012_SCOUT_OVERLOOK.x, input.z - MAP012_SCOUT_OVERLOOK.z) <= MAP012_SCOUT_OVERLOOK.radius;
  const common = { galeActive: active, sheltered, projectileRangeMultiplier: active ? 0.6 : 1, ashDamagePerSecond: active && !sheltered && !input.menuOpen ? 3 : 0, galeTimerMs: active ? galeDuration - clock : period - clock, inventoryMutation: false as const };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" as const }, event: "safe-reset" as const, activateElite: false, activateBoss: false, warning: "GALE EXPOSURE CRITICAL · returning to Scout Overlook", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= 2600) return { memory: { ...memory, state: "boss-active" as const }, event: "gale-terror-zephyr" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "GALE-TERROR ZEPHYR DESCENDS", ...common };
  if (memory.state === "boss-active") return { memory, event: "none" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "GALE-TERROR ZEPHYR ENGAGED · WATCH THE SPIRE EDGES", ...common };
  const atMonolith = Math.hypot(input.x - MAP012_WIND_MONOLITH.x, input.z - MAP012_WIND_MONOLITH.z) <= MAP012_WIND_MONOLITH.radius;
  if (memory.eliteRevealed && input.harvestedGlass >= 10 && !active && input.interacted && atMonolith) return { memory: { ...memory, state: "boss-telegraph" as const, telegraphStartedAt: input.now }, event: "gale-terror-zephyr" as const, activateElite: true, activateBoss: false, warning: "10 RAZOR GLASS RESONATE · WIND MONOLITH WAKING", ...common };
  const elite = input.harvestedGlass >= 5 || input.defeatedStalkers >= 4;
  if (!memory.eliteRevealed && elite) return { memory: { ...memory, state: "elite-active" as const, eliteRevealed: true }, event: "elite-revealed" as const, activateElite: true, activateBoss: false, warning: "GALE-TALON ALPHA DETECTED", ...common };
  const state: Map012Memory["state"] = active ? "gale-active" : warning ? "gale-warning" : clock < galeDuration + 6000 ? "cooldown" : memory.eliteRevealed ? "elite-active" : "idle";
  return { memory: { ...memory, state }, event: memory.state !== "gale-warning" && state === "gale-warning" ? "gale-warning" as const : memory.state !== "gale-active" && state === "gale-active" ? "ash-gale" as const : "none" as const, activateElite: memory.eliteRevealed, activateBoss: false, warning: active ? (sheltered ? "ASH GALE · overlook shielding steady" : "ASH GALE ACTIVE · projectiles weakened 40%") : warning ? "ASH GALE INCOMING · 4.5s" : "", ...common };
}
