export type Map003State = "safe-zone" | "exploring" | "spore-bloom" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated";
export type Map003EventKind = "none" | "spore-bloom" | "elite-revealed" | "mycelium-empress" | "safe-reset";

export type Map003EncounterMemory = {
  state: Map003State;
  eliteRevealed: boolean;
  bossDefeated: boolean;
  telegraphStartedAt?: number;
};

export type Map003EncounterInput = {
  x: number;
  z: number;
  health: number;
  harvestedCrystals: number;
  defeatedBeetles: number;
  interacted: boolean;
  now: number;
};

export type Map003EncounterResult = {
  memory: Map003EncounterMemory;
  event: Map003EventKind;
  bloomActive: boolean;
  spawnBeetles: number;
  activateElite: boolean;
  activateBoss: boolean;
  safeZone: boolean;
  healPerSecond: number;
  enemySpeedMultiplier: number;
  warning?: string;
};

export const MAP003_LYRA_CAMP = { x: 12.5, z: -8.2, radius: 6 };
export const MAP003_ELITE_SITE = { x: -18.4, z: 24, radius: 8 };
export const MAP003_EMPRESS_SHRINE = { x: 0, z: 38, radius: 8 };
export const MAP003_BLOOM_PERIOD_MS = 360_000;
export const MAP003_BLOOM_DURATION_MS = 90_000;
export const MAP003_BLOOM_OFFSET_MS = 180_000;
export const MAP003_TELEGRAPH_MS = 2600;

const distance = (x: number, z: number, point: { x: number; z: number }) => Math.hypot(x - point.x, z - point.z);
const inBloomWindow = (now: number) => ((Math.max(0, now) + MAP003_BLOOM_OFFSET_MS) % MAP003_BLOOM_PERIOD_MS) < MAP003_BLOOM_DURATION_MS;

export const initialMap003Encounter = (): Map003EncounterMemory => ({ state: "safe-zone", eliteRevealed: false, bossDefeated: false });

export function resolveMap003Encounter(memory: Map003EncounterMemory, input: Map003EncounterInput): Map003EncounterResult {
  const safeZone = distance(input.x, input.z, MAP003_LYRA_CAMP) <= MAP003_LYRA_CAMP.radius;
  const bloomActive = inBloomWindow(input.now);
  const common = { bloomActive, safeZone, healPerSecond: bloomActive ? 5 : 0, enemySpeedMultiplier: bloomActive ? 1.25 : 1 };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" }, event: "safe-reset", spawnBeetles: 0, activateElite: false, activateBoss: false, warning: "SPORE SIGNAL LOST · returning to Researcher Lyra", ...common };

  if (!memory.bossDefeated && bloomActive && input.interacted && distance(input.x, input.z, MAP003_EMPRESS_SHRINE) <= MAP003_EMPRESS_SHRINE.radius && memory.state !== "boss-active") {
    return { memory: { ...memory, state: "boss-telegraph", eliteRevealed: memory.eliteRevealed, bossDefeated: false, telegraphStartedAt: input.now }, event: "mycelium-empress", spawnBeetles: 0, activateElite: memory.eliteRevealed, activateBoss: false, warning: "MYCELIUM SHRINE BLOOMING · HOLD POSITION", ...common };
  }
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP003_TELEGRAPH_MS) {
    return { memory: { ...memory, state: "boss-active" }, event: "mycelium-empress", spawnBeetles: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "MYCELIUM EMPRESS HAS AWAKENED", ...common };
  }
  if (memory.state === "boss-active") return { memory, event: "none", spawnBeetles: 0, activateElite: memory.eliteRevealed, activateBoss: true, warning: "MYCELIUM EMPRESS ENGAGED · spores are unstable", ...common };

  const eliteCondition = input.harvestedCrystals >= 2 || input.defeatedBeetles >= 4;
  if (!memory.eliteRevealed && eliteCondition) return { memory: { ...memory, state: "elite-active", eliteRevealed: true }, event: "elite-revealed", spawnBeetles: 0, activateElite: true, activateBoss: false, warning: "LUMINOUS STALKER REVEALED · DO NOT LOSE THE GLOW", ...common };

  const state: Map003State = safeZone ? "safe-zone" : bloomActive ? "spore-bloom" : memory.eliteRevealed ? "elite-active" : "exploring";
  const bloomStarted = state === "spore-bloom" && memory.state !== "spore-bloom";
  return { memory: { ...memory, state }, event: bloomStarted ? "spore-bloom" : "none", spawnBeetles: bloomStarted ? 2 : 0, activateElite: memory.eliteRevealed, activateBoss: false, warning: bloomActive ? "SPORE BLOOM ACTIVE · health regeneration up, enemies enraged" : undefined, ...common };
}
