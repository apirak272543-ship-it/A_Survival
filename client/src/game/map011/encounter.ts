export type Map011Memory = { state: "idle" | "vent-warning" | "vent-active" | "cooldown" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map011Input = { x: number; z: number; health: number; harvestedBloom: number; defeatedCrawlers: number; interacted: boolean; now: number; menuOpen?: boolean };
export const MAP011_FORGE_CAMP = { x: -12, z: 10, radius: 7 };
export const MAP011_SMELTER_ARCH = { x: 28, z: -24, radius: 8 };
const period = 50000, warningDuration = 4000, ventDuration = 6000;
export const initialMap011Encounter = (): Map011Memory => ({ state: "idle", eliteRevealed: false });
export function resolveMap011Encounter(memory: Map011Memory, input: Map011Input) {
  const clock = Math.max(0, input.now) % period; const warning = clock >= period - warningDuration; const active = clock < ventDuration;
  const sheltered = Math.hypot(input.x - MAP011_FORGE_CAMP.x, input.z - MAP011_FORGE_CAMP.z) <= MAP011_FORGE_CAMP.radius;
  const common = { ventActive: active, sheltered, ventDamagePerSecond: active && !sheltered && !input.menuOpen ? 5 : 0, ventTimerMs: active ? ventDuration - clock : period - clock, inventoryMutation: false as const };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" as const }, event: "safe-reset" as const, activateElite: false, activateBoss: false, warning: "HEAT STROKE CRITICAL · returning to Forgemaster Camp", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= 2600) return { memory: { ...memory, state: "boss-active" as const }, event: "ignis-colossus" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "IGNIS COLOSSUS ERUPTS", ...common };
  if (memory.state === "boss-active") return { memory, event: "none" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "IGNIS COLOSSUS ENGAGED · HOLD BASALT GROUND", ...common };
  const atArch = Math.hypot(input.x - MAP011_SMELTER_ARCH.x, input.z - MAP011_SMELTER_ARCH.z) <= MAP011_SMELTER_ARCH.radius;
  if (memory.eliteRevealed && input.harvestedBloom >= 10 && !active && input.interacted && atArch) return { memory: { ...memory, state: "boss-telegraph" as const, telegraphStartedAt: input.now }, event: "ignis-colossus" as const, activateElite: true, activateBoss: false, warning: "10 CINDER BLOOM IGNITE · SMELTER ARCH OPENING", ...common };
  const elite = input.harvestedBloom >= 5 || input.defeatedCrawlers >= 4;
  if (!memory.eliteRevealed && elite) return { memory: { ...memory, state: "elite-active" as const, eliteRevealed: true }, event: "elite-revealed" as const, activateElite: true, activateBoss: false, warning: "PYROCLAST BRUTE DETECTED", ...common };
  const state: Map011Memory["state"] = active ? "vent-active" : warning ? "vent-warning" : clock < ventDuration + 6000 ? "cooldown" : memory.eliteRevealed ? "elite-active" : "idle";
  return { memory: { ...memory, state }, event: memory.state !== "vent-warning" && state === "vent-warning" ? "vent-warning" as const : memory.state !== "vent-active" && state === "vent-active" ? "lava-vent" as const : "none" as const, activateElite: memory.eliteRevealed, activateBoss: false, warning: active ? (sheltered ? "LAVA VENT · basalt shelter holding" : "LAVA VENT ACTIVE · reach Forgemaster Camp") : warning ? "LAVA VENT INCOMING · 4s" : "", ...common };
}
