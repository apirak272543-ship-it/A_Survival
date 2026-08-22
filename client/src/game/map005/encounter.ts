export type Map005Memory = { state: "safe-zone" | "exploring" | "acid-drizzle" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map005Input = { x: number; z: number; health: number; harvestedLilies: number; defeatedSlimes: number; interacted: boolean; now: number };
export type Map005Result = { memory: Map005Memory; event: "none" | "acid-drizzle" | "elite-revealed" | "toxic-hydra" | "safe-reset"; drizzleActive: boolean; sheltered: boolean; acidDamagePerSecond: number; spawnSlimes: number; activateElite: boolean; activateBoss: boolean; warning?: string };
export const MAP005_VANE_SHELTER = { x: 14, z: -8, radius: 7 };
export const MAP005_HYDRA_NEST = { x: 32, z: 28, radius: 8 };
export const MAP005_DRIZZLE_PERIOD_MS = 300_000; export const MAP005_DRIZZLE_DURATION_MS = 80_000; export const MAP005_DRIZZLE_OFFSET_MS = 60_000; export const MAP005_TELEGRAPH_MS = 2600;
const dist = (x: number, z: number, point: { x: number; z: number }) => Math.hypot(x - point.x, z - point.z);
const drizzleWindow = (now: number) => ((Math.max(0, now) + MAP005_DRIZZLE_OFFSET_MS) % MAP005_DRIZZLE_PERIOD_MS) < MAP005_DRIZZLE_DURATION_MS;
export const initialMap005Encounter = (): Map005Memory => ({ state: "safe-zone", eliteRevealed: false });
export function resolveMap005Encounter(memory: Map005Memory, input: Map005Input): Map005Result {
  const drizzleActive = drizzleWindow(input.now); const sheltered = dist(input.x, input.z, MAP005_VANE_SHELTER) <= MAP005_VANE_SHELTER.radius; const common = { drizzleActive, sheltered, acidDamagePerSecond: drizzleActive && !sheltered ? 6 : 0 };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" }, event: "safe-reset", spawnSlimes: 0, activateElite: false, activateBoss: false, warning: "ACID EXPOSURE CRITICAL · returning to Alchemist Vane", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP005_TELEGRAPH_MS) return { memory: { ...memory, state: "boss-active" }, event: "toxic-hydra", spawnSlimes: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "TOXIC HYDRA HAS SURFACED", ...common };
  if (memory.state === "boss-active") return { memory, event: "none", spawnSlimes: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "TOXIC HYDRA ENGAGED · avoid acid pools", ...common };
  if (memory.eliteRevealed && !drizzleActive && input.interacted && dist(input.x, input.z, MAP005_HYDRA_NEST) <= MAP005_HYDRA_NEST.radius) return { memory: { ...memory, state: "boss-telegraph", telegraphStartedAt: input.now }, event: "toxic-hydra", spawnSlimes: 0, activateElite: true, activateBoss: false, warning: "HYDRA NEST DISTURBED · HOLD POSITION", ...common };
  const eliteCondition = input.harvestedLilies >= 3 || input.defeatedSlimes >= 4;
  if (!memory.eliteRevealed && eliteCondition) return { memory: { ...memory, state: "elite-active", eliteRevealed: true }, event: "elite-revealed", spawnSlimes: 0, activateElite: true, activateBoss: false, warning: "MIRE LURKER AMBUSH · corrosive plates detected", ...common };
  const state: Map005Memory["state"] = sheltered ? "safe-zone" : drizzleActive ? "acid-drizzle" : memory.eliteRevealed ? "elite-active" : "exploring"; const started = state === "acid-drizzle" && memory.state !== "acid-drizzle";
  return { memory: { ...memory, state }, event: started ? "acid-drizzle" : "none", spawnSlimes: started ? 2 : 0, activateElite: memory.eliteRevealed, activateBoss: false, warning: drizzleActive ? (sheltered ? "ACID DRIZZLE · shelter integrity holding" : "ACID DRIZZLE ACTIVE · find Alchemist Vane shelter") : undefined, ...common };
}
