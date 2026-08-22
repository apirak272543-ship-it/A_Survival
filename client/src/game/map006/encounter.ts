export type Map006Input = { x: number; z: number; health: number; harvestedMagnetite: number; defeatedRays: number; interacted: boolean; now: number };
export type Map006Memory = { state: "safe-zone" | "exploring" | "magnetic-storm" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated"; eliteRevealed: boolean; telegraphStartedAt?: number };
export type Map006Result = { memory: Map006Memory; event: "none" | "magnetic-storm" | "elite-revealed" | "lodestone-colossus" | "safe-reset"; stormActive: boolean; sheltered: boolean; temporaryHudJammed: boolean; spawnRays: number; activateElite: boolean; activateBoss: boolean; warning?: string };

export const MAP006_STABILIZER = { x: 14, z: -8, radius: 7 };
export const MAP006_COLOSSUS_CORE = { x: 32, z: 28, radius: 8 };
export const MAP006_STORM_PERIOD_MS = 300_000; export const MAP006_STORM_DURATION_MS = 75_000; export const MAP006_STORM_OFFSET_MS = 100_000; export const MAP006_TELEGRAPH_MS = 2600;
const distance = (x: number, z: number, point: { x: number; z: number }) => Math.hypot(x - point.x, z - point.z);
const stormWindow = (now: number) => ((Math.max(0, now) + MAP006_STORM_OFFSET_MS) % MAP006_STORM_PERIOD_MS) < MAP006_STORM_DURATION_MS;
export const initialMap006Encounter = (): Map006Memory => ({ state: "safe-zone", eliteRevealed: false });

export function resolveMap006Encounter(memory: Map006Memory, input: Map006Input): Map006Result {
  const stormActive = stormWindow(input.now); const sheltered = distance(input.x, input.z, MAP006_STABILIZER) <= MAP006_STABILIZER.radius;
  const common = { stormActive, sheltered, temporaryHudJammed: stormActive && !sheltered };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" }, event: "safe-reset", spawnRays: 0, activateElite: false, activateBoss: false, warning: "MAGNETIC OVERLOAD · returning to Engineer Rusty", ...common };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP006_TELEGRAPH_MS) return { memory: { ...memory, state: "boss-active" }, event: "lodestone-colossus", spawnRays: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "LODESTONE COLOSSUS HAS AWAKENED", ...common };
  if (memory.state === "boss-active") return { memory, event: "none", spawnRays: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "LODESTONE COLOSSUS ENGAGED · ignore false compass headings", ...common };
  if (memory.eliteRevealed && !stormActive && input.interacted && distance(input.x, input.z, MAP006_COLOSSUS_CORE) <= MAP006_COLOSSUS_CORE.radius) return { memory: { ...memory, state: "boss-telegraph", telegraphStartedAt: input.now }, event: "lodestone-colossus", spawnRays: 0, activateElite: true, activateBoss: false, warning: "LODESTONE CORE DISTURBED · HOLD POSITION", ...common };
  const eliteCondition = input.harvestedMagnetite >= 3 || input.defeatedRays >= 4;
  if (!memory.eliteRevealed && eliteCondition) return { memory: { ...memory, state: "elite-active", eliteRevealed: true }, event: "elite-revealed", spawnRays: 0, activateElite: true, activateBoss: false, warning: "IRONCLAD GOLEM DETECTED · stabilizer field weakened", ...common };
  const state: Map006Memory["state"] = sheltered ? "safe-zone" : stormActive ? "magnetic-storm" : memory.eliteRevealed ? "elite-active" : "exploring";
  const started = state === "magnetic-storm" && memory.state !== "magnetic-storm";
  return { memory: { ...memory, state }, event: started ? "magnetic-storm" : "none", spawnRays: started ? 2 : 0, activateElite: memory.eliteRevealed, activateBoss: false, warning: stormActive ? (sheltered ? "MAGNETIC STORM · stabilizer shielding active" : "MAGNETIC STORM · HUD interference only, reach Engineer Rusty") : undefined, ...common };
}
