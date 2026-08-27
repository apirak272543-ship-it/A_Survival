import { DEFAULT_IN_MAP_SETTINGS, type InMapSettings } from "../client/src/game/systems/cameraModes";
import { DEFAULT_SETTINGS, type GameSettings } from "../client/src/game/storage/session";

export const GLOBAL_SETTING_KEYS = [
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
] as const;

export const IN_MAP_SETTING_KEYS = ["cameraMode", "viewDistanceBlocks", "targetFps"] as const;

type GlobalSettingKey = (typeof GLOBAL_SETTING_KEYS)[number];
type InMapSettingKey = (typeof IN_MAP_SETTING_KEYS)[number];

type SettingsRecord = Record<string, unknown>;

export type SeparatedSettings = {
  global: Partial<Record<GlobalSettingKey, unknown>>;
  inMap: Partial<Record<InMapSettingKey, unknown>>;
  unknownKeys: string[];
};

export type SettingsSeparationIssue = {
  key: string;
  expected: "global" | "in-map";
  actual: "global" | "in-map";
  message: string;
};

export type SettingsSeparationResult = {
  valid: boolean;
  issues: SettingsSeparationIssue[];
};

const globalKeys = new Set<string>(GLOBAL_SETTING_KEYS);
const inMapKeys = new Set<string>(IN_MAP_SETTING_KEYS);

export function splitSettingsRecord(candidate: SettingsRecord): SeparatedSettings {
  const global: Partial<Record<GlobalSettingKey, unknown>> = {};
  const inMap: Partial<Record<InMapSettingKey, unknown>> = {};
  const unknownKeys: string[] = [];
  for (const [key, value] of Object.entries(candidate).sort(([left], [right]) => left.localeCompare(right))) {
    if (globalKeys.has(key)) global[key as GlobalSettingKey] = value;
    else if (inMapKeys.has(key)) inMap[key as InMapSettingKey] = value;
    else unknownKeys.push(key);
  }
  return { global, inMap, unknownKeys };
}

export function validateSettingsSeparation(input: { global: SettingsRecord; inMap: SettingsRecord }): SettingsSeparationResult {
  const issues: SettingsSeparationIssue[] = [];
  for (const key of Object.keys(input.global).sort()) {
    if (inMapKeys.has(key)) issues.push({ key, expected: "in-map", actual: "global", message: `${key} belongs to in-map settings` });
  }
  for (const key of Object.keys(input.inMap).sort()) {
    if (globalKeys.has(key)) issues.push({ key, expected: "global", actual: "in-map", message: `${key} belongs to global settings` });
  }
  return { valid: issues.length === 0, issues };
}

export function createDefaultSeparatedSettings() {
  const flat: GameSettings & InMapSettings = { ...DEFAULT_SETTINGS, ...DEFAULT_IN_MAP_SETTINGS };
  return splitSettingsRecord(flat);
}
