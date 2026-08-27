import { normalizeInMapSettings, type InMapSettings } from "../client/src/game/systems/cameraModes";
import type { GameSettings } from "../client/src/game/storage/session";

export const SETTINGS_SCOPE_BOUNDARY_VERSION = "settings-scope-boundary.v1" as const;

export const GLOBAL_SETTINGS_KEYS = [
  "language",
  "quality",
  "performanceTier",
  "effectIntensity",
  "musicVolume",
  "sfxVolume",
  "reducedMotion",
  "touchPreference",
  "renderDistance",
  "cameraDefaultMode",
  "touchScale",
  "touchOpacity",
] as const satisfies readonly (keyof GameSettings)[];

export const IN_MAP_SETTINGS_KEYS = ["cameraMode", "viewDistanceBlocks", "targetFps"] as const;

export type SettingsScope = "global" | "in-map";
export type SettingsScopePartition = {
  global: Partial<Pick<GameSettings, (typeof GLOBAL_SETTINGS_KEYS)[number]>>;
  inMap: InMapSettings;
  unknownKeys: string[];
};

export type SettingsScopeBoundaryResult = {
  contractVersion: typeof SETTINGS_SCOPE_BOUNDARY_VERSION;
  valid: boolean;
  issues: string[];
  partition: SettingsScopePartition;
  separate: true;
  runtimePolicy: {
    globalWritePerformed: false;
    inMapWritePerformed: false;
    creatorControlExposed: false;
  };
};

const GLOBAL_KEY_SET = new Set<string>(GLOBAL_SETTINGS_KEYS);
const IN_MAP_KEY_SET = new Set<string>(IN_MAP_SETTINGS_KEYS);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

export function partitionSettings(candidate: unknown): SettingsScopePartition {
  const global: SettingsScopePartition["global"] = {};
  const inMapCandidate: Partial<InMapSettings> = {};
  const unknownKeys: string[] = [];
  if (isRecord(candidate)) {
    for (const [key, value] of Object.entries(candidate)) {
      if (GLOBAL_KEY_SET.has(key)) (global as Record<string, unknown>)[key] = value;
      else if (IN_MAP_KEY_SET.has(key)) (inMapCandidate as Record<string, unknown>)[key] = value;
      else unknownKeys.push(key);
    }
  }
  return { global, inMap: normalizeInMapSettings(inMapCandidate), unknownKeys: unknownKeys.sort() };
}

export function evaluateSettingsScopeBoundary(candidate: unknown): SettingsScopeBoundaryResult {
  const partition = partitionSettings(candidate);
  const issues = partition.unknownKeys.map(key => `unknown settings key: ${key}`);
  return {
    contractVersion: SETTINGS_SCOPE_BOUNDARY_VERSION,
    valid: issues.length === 0,
    issues,
    partition,
    separate: true,
    runtimePolicy: { globalWritePerformed: false, inMapWritePerformed: false, creatorControlExposed: false },
  };
}

export function validateSettingsScopeUpdate(input: { scope: SettingsScope; key: string; value: unknown }) {
  const allowed = input.scope === "global" ? GLOBAL_KEY_SET.has(input.key) : IN_MAP_KEY_SET.has(input.key);
  return { valid: allowed, issues: allowed ? [] : [`${input.key} is not allowed in ${input.scope} settings scope`], scope: input.scope, key: input.key, value: input.value };
}

export function canApplyInMapSettings(input: { screen: "global" | "in-map" | "creator"; paused: boolean; focused: boolean }) {
  return input.screen === "in-map" && input.paused && input.focused;
}
