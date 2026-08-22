export type Map004State = "safe-zone" | "exploring" | "laser-field" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated";
export type Map004EncounterMemory = { state: Map004State; eliteRevealed: boolean; telegraphStartedAt?: number; laserRefractedAt?: number };
export type Map004EncounterInput = { x: number; z: number; health: number; harvestedShards: number; defeatedGnats: number; interacted: boolean; now: number };
export type Map004EncounterResult = { memory: Map004EncounterMemory; event: "none" | "laser-field" | "elite-revealed" | "resonance-archon" | "safe-reset"; laserActive: boolean; laserDamagePerSecond: number; playerSpeedMultiplier: number; spawnGnats: number; activateElite: boolean; activateBoss: boolean; warning?: string };

export const MAP004_ZEPHYR_CAMP = { x: 0, z: 5, radius: 6 };
export const MAP004_REFRACTOR_NODE = { x: 20, z: 14, radius: 6 };
export const MAP004_ARCHON_DAIS = { x: 34, z: 32, radius: 8 };
export const MAP004_LASER_PERIOD_MS = 300_000;
export const MAP004_LASER_DURATION_MS = 70_000;
export const MAP004_LASER_OFFSET_MS = 150_000;
export const MAP004_TELEGRAPH_MS = 2600;
const distance = (x: number, z: number, point: { x: number; z: number }) => Math.hypot(x - point.x, z - point.z);
const inLaserWindow = (now: number) => ((Math.max(0, now) + MAP004_LASER_OFFSET_MS) % MAP004_LASER_PERIOD_MS) < MAP004_LASER_DURATION_MS;
export const initialMap004Encounter = (): Map004EncounterMemory => ({ state: "safe-zone", eliteRevealed: false });

export function resolveMap004Encounter(memory: Map004EncounterMemory, input: Map004EncounterInput): Map004EncounterResult {
  const rawLaser = inLaserWindow(input.now);
  const refracted = Boolean(memory.laserRefractedAt && rawLaser);
  const laserActive = rawLaser && !refracted;
  const common = { laserActive, laserDamagePerSecond: laserActive ? 5 : 0, playerSpeedMultiplier: laserActive ? 0.72 : 1 };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" }, event: "safe-reset", spawnGnats: 0, activateElite: false, activateBoss: false, warning: "REFLECTION FIELD OVERLOADED · returning to Zephyr", ...common };
  if (laserActive && input.interacted && distance(input.x, input.z, MAP004_REFRACTOR_NODE) <= MAP004_REFRACTOR_NODE.radius) return { memory: { ...memory, state: "exploring", laserRefractedAt: input.now }, event: "laser-field", spawnGnats: 0, activateElite: memory.eliteRevealed, activateBoss: false, warning: "PRISM REFRACTOR STABLE · laser path diverted", ...common, laserActive: false, laserDamagePerSecond: 0, playerSpeedMultiplier: 1 };
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP004_TELEGRAPH_MS) return { memory: { ...memory, state: "boss-active" }, event: "resonance-archon", spawnGnats: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "RESONANCE ARCHON HAS AWAKENED", ...common };
  if (memory.state === "boss-active") return { memory, event: "none", spawnGnats: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "RESONANCE ARCHON ENGAGED · maintain frequency", ...common };
  if (memory.eliteRevealed && !laserActive && input.interacted && distance(input.x, input.z, MAP004_ARCHON_DAIS) <= MAP004_ARCHON_DAIS.radius) return { memory: { ...memory, state: "boss-telegraph", telegraphStartedAt: input.now }, event: "resonance-archon", spawnGnats: 0, activateElite: true, activateBoss: false, warning: "RESONANCE DAIS CHARGING · HOLD POSITION", ...common };
  const eliteCondition = input.harvestedShards >= 3 || input.defeatedGnats >= 4;
  if (!memory.eliteRevealed && eliteCondition) return { memory: { ...memory, state: "elite-active", eliteRevealed: true }, event: "elite-revealed", spawnGnats: 0, activateElite: true, activateBoss: false, warning: "PRISM GOLEM REVEALED · reflective shield detected", ...common };
  const state: Map004State = distance(input.x, input.z, MAP004_ZEPHYR_CAMP) <= MAP004_ZEPHYR_CAMP.radius ? "safe-zone" : laserActive ? "laser-field" : memory.eliteRevealed ? "elite-active" : "exploring";
  const started = state === "laser-field" && memory.state !== "laser-field";
  return { memory: { ...memory, state }, event: started ? "laser-field" : "none", spawnGnats: started ? 2 : 0, activateElite: memory.eliteRevealed, activateBoss: false, warning: laserActive ? "REFLECTION LASER FIELD ACTIVE · find a prism refractor" : undefined, ...common };
}
