export type Map001Phase = "day" | "night";
export type Map001State = "safe-zone" | "exploring" | "distress-telegraph" | "distress-active" | "boss-telegraph" | "boss-active" | "defeated";
export type Map001EventKind = "none" | "distress-pod" | "void-reaper" | "safe-reset";

export type Map001EncounterMemory = {
  state: Map001State;
  distressResolved: boolean;
  bossDefeated: boolean;
  telegraphStartedAt?: number;
};

export type Map001EncounterInput = {
  x: number;
  z: number;
  health: number;
  phase: Map001Phase;
  interacted: boolean;
  now: number;
};

export type Map001EncounterResult = {
  memory: Map001EncounterMemory;
  event: Map001EventKind;
  spawnGlassStalkers: number;
  activateVoidReaper: boolean;
  safeZone: boolean;
  warning?: string;
};

export const MAP001_SAFE_ZONE_RADIUS = 7;
export const MAP001_DISTRESS_POD = { x: 16, z: -11, radius: 4.5 };
export const MAP001_MONOLITH = { x: 0, z: -18, radius: 8 };
export const MAP001_TELEGRAPH_MS = 2600;

const distance = (x: number, z: number, point: { x: number; z: number }) => Math.hypot(x - point.x, z - point.z);

export const initialMap001Encounter = (): Map001EncounterMemory => ({ state: "safe-zone", distressResolved: false, bossDefeated: false });

export function resolveMap001Encounter(memory: Map001EncounterMemory, input: Map001EncounterInput): Map001EncounterResult {
  const inSafeZone = Math.hypot(input.x, input.z) <= MAP001_SAFE_ZONE_RADIUS;
  if (input.health <= 0) {
    return { memory: { ...memory, state: "defeated" }, event: "safe-reset", spawnGlassStalkers: 0, activateVoidReaper: false, safeZone: true, warning: "Signal lost · returning to Commander Koral" };
  }

  if (!memory.distressResolved && input.interacted && distance(input.x, input.z, MAP001_DISTRESS_POD) <= MAP001_DISTRESS_POD.radius) {
    return { memory: { ...memory, state: "distress-telegraph", distressResolved: true, bossDefeated: memory.bossDefeated, telegraphStartedAt: input.now }, event: "distress-pod", spawnGlassStalkers: 0, activateVoidReaper: false, safeZone: false, warning: "DISTRESS POD SIGNAL UNSTABLE" };
  }

  if (memory.state === "distress-telegraph" && memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP001_TELEGRAPH_MS) {
    return { memory: { ...memory, state: "distress-active" }, event: "distress-pod", spawnGlassStalkers: 3, activateVoidReaper: false, safeZone: false, warning: "TRAP ACTIVATED · GLASS STALKERS INBOUND" };
  }

  const atMonolith = distance(input.x, input.z, MAP001_MONOLITH) <= MAP001_MONOLITH.radius;
  if (!memory.bossDefeated && input.phase === "night" && atMonolith && memory.state !== "boss-active") {
    if (memory.state !== "boss-telegraph") {
      return { memory: { ...memory, state: "boss-telegraph", telegraphStartedAt: input.now }, event: "void-reaper", spawnGlassStalkers: 0, activateVoidReaper: false, safeZone: false, warning: "VOID FISSURE DETECTED · HOLD POSITION" };
    }
    if (memory.telegraphStartedAt && input.now - memory.telegraphStartedAt >= MAP001_TELEGRAPH_MS) {
      return { memory: { ...memory, state: "boss-active" }, event: "void-reaper", spawnGlassStalkers: 0, activateVoidReaper: true, safeZone: false, warning: "VOID REAPER HAS BREACHED THE MONOLITH" };
    }
  }

  const state: Map001State = inSafeZone ? "safe-zone" : memory.state === "distress-active" || memory.state === "boss-active" ? memory.state : "exploring";
  return { memory: { ...memory, state }, event: "none", spawnGlassStalkers: 0, activateVoidReaper: state === "boss-active", safeZone: inSafeZone };
}
