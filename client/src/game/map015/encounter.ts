export type Map015Memory = { state: "idle" | "heat-warning" | "heat-active" | "cooldown" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map015Input = { x: number; z: number; health: number; harvestedEmber: number; defeatedMyrmidons: number; interacted: boolean; now: number; menuOpen?: boolean };
export const MAP015_FORGE_SHRINE = { x: 0, z: 0, radius: 8 };
export const MAP015_PRIMAL_ANVIL = { x: 34, z: 28, radius: 8 };
const period = 40000, warningDuration = 4000, pulseDuration = 6000;
export const initialMap015Encounter = (): Map015Memory => ({ state: "idle", eliteRevealed: false });
export function resolveMap015Encounter(memory: Map015Memory, input: Map015Input) {
  const clock = Math.max(0, input.now) % period; const warning = clock >= period - warningDuration; const active = clock < pulseDuration;
  const sheltered = Math.hypot(input.x - MAP015_FORGE_SHRINE.x, input.z - MAP015_FORGE_SHRINE.z) <= MAP015_FORGE_SHRINE.radius;
  const common = { pulseActive: active, sheltered, staminaDrainPerSecond: active && !sheltered && !input.menuOpen ? 8 : 2, pulseTimerMs: active ? pulseDuration - clock : period - clock, inventoryMutation: false as const };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" as const }, event: "safe-reset" as const, activateElite: false, activateBoss: false, warning: "CORE OVERLOAD CRITICAL · returning to Forge Shrine", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= 3000) return { memory: { ...memory, state: "boss-active" as const }, event: "crucible-overlord" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "THE CRUCIBLE OVERLORD AWAKENS", ...common };
  if (memory.state === "boss-active") return { memory, event: "none" as const, activateElite: memory.eliteRevealed, activateBoss: true, warning: "CRUCIBLE OVERLORD ENGAGED · WATCH CORE PULSES", ...common };
  const atAnvil = Math.hypot(input.x - MAP015_PRIMAL_ANVIL.x, input.z - MAP015_PRIMAL_ANVIL.z) <= MAP015_PRIMAL_ANVIL.radius;
  if (memory.eliteRevealed && input.harvestedEmber >= 10 && !active && input.interacted && atAnvil) return { memory: { ...memory, state: "boss-telegraph" as const, telegraphStartedAt: input.now }, event: "crucible-overlord" as const, activateElite: true, activateBoss: false, warning: "10 PRIMAL EMBER FUSE · PRIMAL ANVIL RINGING", ...common };
  const elite = input.harvestedEmber >= 5 || input.defeatedMyrmidons >= 4;
  if (!memory.eliteRevealed && elite) return { memory: { ...memory, state: "elite-active" as const, eliteRevealed: true }, event: "elite-revealed" as const, activateElite: true, activateBoss: false, warning: "DREAD INFERNAL GOLIATH DETECTED", ...common };
  const state: Map015Memory["state"] = active ? "heat-active" : warning ? "heat-warning" : clock < pulseDuration + 6000 ? "cooldown" : memory.eliteRevealed ? "elite-active" : "idle";
  return { memory: { ...memory, state }, event: memory.state !== "heat-warning" && state === "heat-warning" ? "heat-warning" as const : memory.state !== "heat-active" && state === "heat-active" ? "core-pulse" as const : "none" as const, activateElite: memory.eliteRevealed, activateBoss: false, warning: active ? (sheltered ? "CORE PULSE · forge shrine absorbing" : "CORE PULSE ACTIVE · stamina draining") : warning ? "CORE PULSE INCOMING · 4s" : "AMBIENT HEAT RISING", ...common };
}
