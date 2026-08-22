export type Map002State = "safe-zone" | "exploring" | "ash-storm" | "elite-active" | "boss-telegraph" | "boss-active" | "defeated";
export type Map002EventKind = "none" | "ash-storm" | "elite-awakened" | "pyroclastic-behemoth" | "safe-reset";

export type Map002EncounterMemory = {
  state: Map002State;
  eliteAwakened: boolean;
  bossDefeated: boolean;
  telegraphStartedAt?: number;
};

export type Map002EncounterInput = {
  x: number;
  z: number;
  health: number;
  harvestedResources: number;
  defeatedAshCrawlers: number;
  interacted: boolean;
  now: number;
};

export type Map002EncounterResult = {
  memory: Map002EncounterMemory;
  event: Map002EventKind;
  stormActive: boolean;
  spawnAshCrawlers: number;
  activateElite: boolean;
  activateBoss: boolean;
  safeZone: boolean;
  enemySpeedMultiplier: number;
  rareDropMultiplier: number;
  warning?: string;
};

export const MAP002_JAX_CAMP = { x: -15, z: -20, radius: 6 };
export const MAP002_ELITE_SITE = { x: 25, z: 5, radius: 7 };
export const MAP002_PYROCLASTIC_ALTAR = { x: 0, z: 30, radius: 7 };
export const MAP002_STORM_PERIOD_MS = 450_000;
export const MAP002_STORM_DURATION_MS = 120_000;
export const MAP002_TELEGRAPH_MS = 2600;

const distance = (x: number, z: number, point: { x: number; z: number }) => Math.hypot(x - point.x, z - point.z);
const inStormWindow = (now: number) => (Math.max(0, now) % MAP002_STORM_PERIOD_MS) < MAP002_STORM_DURATION_MS;

export const initialMap002Encounter = (): Map002EncounterMemory => ({ state: "safe-zone", eliteAwakened: false, bossDefeated: false });

export function resolveMap002Encounter(memory: Map002EncounterMemory, input: Map002EncounterInput): Map002EncounterResult {
  const safeZone = distance(input.x, input.z, MAP002_JAX_CAMP) <= MAP002_JAX_CAMP.radius;
  const stormActive = inStormWindow(input.now);
  const common = { stormActive, safeZone, enemySpeedMultiplier: stormActive ? 1.2 : 1, rareDropMultiplier: stormActive ? 2 : 1 };
  if (input.health <= 0) return { memory: { ...memory, state: "defeated" }, event: "safe-reset", spawnAshCrawlers: 0, activateElite: false, activateBoss: false, warning: "HEAT SIGNATURE LOST · returning to Scavenger Jax", ...common };

  if (!memory.bossDefeated && stormActive && input.interacted && distance(input.x, input.z, MAP002_PYROCLASTIC_ALTAR) <= MAP002_PYROCLASTIC_ALTAR.radius && memory.state !== "boss-active") {
    return { memory: { ...memory, state: "boss-telegraph", eliteAwakened: memory.eliteAwakened, bossDefeated: false, telegraphStartedAt: input.now }, event: "pyroclastic-behemoth", spawnAshCrawlers: 0, activateElite: memory.eliteAwakened, activateBoss: false, warning: "PYROCLASTIC ALTAR OVERLOADING · HOLD POSITION", ...common };
  }
  if (memory.state === "boss-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP002_TELEGRAPH_MS) {
    return { memory: { ...memory, state: "boss-active" }, event: "pyroclastic-behemoth", spawnAshCrawlers: 0, activateElite: memory.eliteAwakened, activateBoss: true, warning: "PYROCLASTIC BEHEMOTH HAS AWAKENED", ...common };
  }
  if (memory.state === "boss-active") {
    return { memory, event: "none", spawnAshCrawlers: 0, activateElite: memory.eliteAwakened, activateBoss: true, warning: "PYROCLASTIC BEHEMOTH ENGAGED · keep moving", ...common };
  }

  const eliteCondition = input.harvestedResources >= 3 || input.defeatedAshCrawlers >= 5;
  if (!memory.eliteAwakened && eliteCondition) {
    return { memory: { ...memory, state: "elite-active", eliteAwakened: true, bossDefeated: memory.bossDefeated }, event: "elite-awakened", spawnAshCrawlers: 0, activateElite: true, activateBoss: false, warning: "OBSIDIAN SHELL GOLEM DETECTED · PROTECT THE VEINS", ...common };
  }

  const state: Map002State = safeZone ? "safe-zone" : stormActive ? "ash-storm" : memory.eliteAwakened ? "elite-active" : "exploring";
  const stormStarted = state === "ash-storm" && memory.state !== "ash-storm";
  return { memory: { ...memory, state }, event: stormStarted ? "ash-storm" : "none", spawnAshCrawlers: stormStarted ? 2 : 0, activateElite: memory.eliteAwakened, activateBoss: false, warning: stormActive ? "ASH STORM ACTIVE · rare resource yield doubled" : undefined, ...common };
}
