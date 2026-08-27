import { PLANT_CATALOG, type PlantDefinition, type PlantEffectKind } from "../client/src/game/data/plantCatalog";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const PLANT_EFFECT_COVERAGE_SCHEMA_VERSION = "a-survival.plant-effect-coverage.v1" as const;
export const PLANT_EFFECT_COVERAGE_CONTRACT_VERSION = "1.0.0" as const;
export const FICTIONAL_PLANT_EFFECT_POWER_CAP = 10;
export const FICTIONAL_REPELLENT_RADIUS_CAP_METERS = 12;
const MAX_PLANT_SAMPLES = 256;
const EFFECT_KINDS = ["food", "healing", "repellent", "aether", "crafting"] as const satisfies readonly PlantEffectKind[];
const UNSUPPORTED_EFFECT_KINDS = ["buff", "damage"] as const;

type EffectIssueCode =
  | "PLANT_IDS_NOT_ARRAY"
  | "PLANT_IDS_TRUNCATED"
  | "PLANT_ID_INVALID"
  | "UNKNOWN_PLANT_ID"
  | "INVALID_PLANT_EFFECT"
  | "POWER_OVER_CAP"
  | "RADIUS_OVER_CAP";

type EffectIssue = {
  code: EffectIssueCode;
  detail: string;
  plantId?: string;
};

export type PlantEffectCoverageInput = {
  plantIds?: unknown;
};

export type PlantEffectCoverageReport = {
  schemaVersion: typeof PLANT_EFFECT_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof PLANT_EFFECT_COVERAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  catalogPlantCount: number;
  sampledPlantCount: number;
  catalogDuplicateIdCount: number;
  effectKindCounts: Record<PlantEffectKind, number>;
  maxPowerByKind: Record<PlantEffectKind, number>;
  maxRadiusByKindMeters: Record<PlantEffectKind, number>;
  cappedPowerCount: number;
  cappedRadiusCount: number;
  healingPowerCap: number;
  fictionalPowerCap: number;
  fictionalRepellentRadiusCapMeters: number;
  unsupportedEffectKinds: readonly ["buff", "damage"];
  unsupportedEffectReason: string;
  issues: EffectIssue[];
  blockers: [
    { id: "runtime-effect-caller"; required: true; status: "missing-evidence"; reason: string },
    { id: "damage-effect-owner"; required: true; status: "missing-evidence"; reason: string },
    { id: "cactus-hazard-owner"; required: true; status: "missing-evidence"; reason: string },
    { id: "medical-safety-validation"; required: true; status: "missing-evidence"; reason: string },
  ];
  claims: {
    effectApplied: false;
    healingGranted: false;
    damageApplied: false;
    repelApplied: false;
    cactusHazardApplied: false;
    medicalOutcome: false;
    gameplayMutation: false;
    playerVisible: false;
  };
  contentSha256: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function countDuplicateIds(definitions: readonly PlantDefinition[]) {
  return definitions.length - new Set(definitions.map(plant => plant.id)).size;
}

function normalizePlantIds(input: unknown, issues: EffectIssue[]) {
  if (input === undefined) return PLANT_CATALOG.map(plant => plant.id);
  if (!Array.isArray(input)) {
    issues.push({ code: "PLANT_IDS_NOT_ARRAY", detail: "plantIds must be an array; the canonical bounded plant sample was used" });
    return PLANT_CATALOG.slice(0, MAX_PLANT_SAMPLES).map(plant => plant.id);
  }
  if (input.length > MAX_PLANT_SAMPLES) issues.push({ code: "PLANT_IDS_TRUNCATED", detail: `plantIds was truncated to ${MAX_PLANT_SAMPLES} entries` });
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const value of input.slice(0, MAX_PLANT_SAMPLES)) {
    if (!isNonEmptyString(value)) {
      issues.push({ code: "PLANT_ID_INVALID", detail: "each plantId must be a non-empty string" });
      continue;
    }
    if (seen.has(value)) continue;
    seen.add(value);
    ids.push(value);
  }
  return ids;
}

function buildBlockers(): PlantEffectCoverageReport["blockers"] {
  return [
    { id: "runtime-effect-caller", required: true, status: "missing-evidence", reason: "this checkpoint audits PlantEffect metadata only; it does not apply healing, food, aether, crafting, or repellent effects" },
    { id: "damage-effect-owner", required: true, status: "missing-evidence", reason: "the canonical PlantEffect union has no damage kind, so no damage behavior is fabricated" },
    { id: "cactus-hazard-owner", required: true, status: "missing-evidence", reason: "cactus thorn damage is owned by block hazard metadata and requires a separate runtime collision/damage caller" },
    { id: "medical-safety-validation", required: true, status: "missing-evidence", reason: "healing values are fictional game powers and are not medical outcomes or health advice" },
  ];
}

export function buildPlantEffectCoverageReport(input: PlantEffectCoverageInput = {}): PlantEffectCoverageReport {
  const issues: EffectIssue[] = [];
  const ids = normalizePlantIds(input.plantIds, issues);
  const idSet = new Set(PLANT_CATALOG.map(plant => plant.id));
  const definitions = ids.flatMap(plantId => {
    const plant = PLANT_CATALOG.find(candidate => candidate.id === plantId);
    if (!plant) {
      issues.push({ code: "UNKNOWN_PLANT_ID", detail: `plantId ${plantId} is not present in the canonical plant catalog`, plantId });
      return [];
    }
    return [plant];
  });
  void idSet;
  const effectKindCounts = Object.fromEntries(EFFECT_KINDS.map(kind => [kind, definitions.filter(plant => plant.effect.kind === kind).length])) as Record<PlantEffectKind, number>;
  const maxPowerByKind = Object.fromEntries(EFFECT_KINDS.map(kind => [kind, definitions.filter(plant => plant.effect.kind === kind).reduce((maximum, plant) => Math.max(maximum, plant.effect.power), 0)])) as Record<PlantEffectKind, number>;
  const maxRadiusByKindMeters = Object.fromEntries(EFFECT_KINDS.map(kind => [kind, definitions.filter(plant => plant.effect.kind === kind).reduce((maximum, plant) => Math.max(maximum, plant.effect.radiusMeters ?? 0), 0)])) as Record<PlantEffectKind, number>;
  let cappedPowerCount = 0;
  let cappedRadiusCount = 0;
  for (const plant of definitions) {
    const effect = plant.effect;
    if (!EFFECT_KINDS.includes(effect.kind) || !Number.isFinite(effect.power) || effect.power < 0) issues.push({ code: "INVALID_PLANT_EFFECT", detail: `plant ${plant.id} has an invalid PlantEffect kind/power`, plantId: plant.id });
    if (Number.isFinite(effect.power) && effect.power > FICTIONAL_PLANT_EFFECT_POWER_CAP) {
      cappedPowerCount += 1;
      issues.push({ code: "POWER_OVER_CAP", detail: `plant ${plant.id} exceeds fictional power cap ${FICTIONAL_PLANT_EFFECT_POWER_CAP}`, plantId: plant.id });
    }
    if (effect.radiusMeters !== undefined && (!Number.isFinite(effect.radiusMeters) || effect.radiusMeters < 0)) issues.push({ code: "INVALID_PLANT_EFFECT", detail: `plant ${plant.id} has an invalid effect radius`, plantId: plant.id });
    if (effect.radiusMeters !== undefined && effect.radiusMeters > FICTIONAL_REPELLENT_RADIUS_CAP_METERS) {
      cappedRadiusCount += 1;
      issues.push({ code: "RADIUS_OVER_CAP", detail: `plant ${plant.id} exceeds fictional repellent radius cap ${FICTIONAL_REPELLENT_RADIUS_CAP_METERS}`, plantId: plant.id });
    }
  }
  const payload = {
    schemaVersion: PLANT_EFFECT_COVERAGE_SCHEMA_VERSION,
    contractVersion: PLANT_EFFECT_COVERAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    catalogPlantCount: PLANT_CATALOG.length,
    sampledPlantCount: definitions.length,
    catalogDuplicateIdCount: countDuplicateIds(PLANT_CATALOG),
    effectKindCounts,
    maxPowerByKind,
    maxRadiusByKindMeters,
    cappedPowerCount,
    cappedRadiusCount,
    healingPowerCap: FICTIONAL_PLANT_EFFECT_POWER_CAP,
    fictionalPowerCap: FICTIONAL_PLANT_EFFECT_POWER_CAP,
    fictionalRepellentRadiusCapMeters: FICTIONAL_REPELLENT_RADIUS_CAP_METERS,
    unsupportedEffectKinds: UNSUPPORTED_EFFECT_KINDS,
    unsupportedEffectReason: "buff and damage are not represented by the canonical PlantEffect type; this audit does not invent either effect",
    issues,
    blockers: buildBlockers(),
    claims: { effectApplied: false as const, healingGranted: false as const, damageApplied: false as const, repelApplied: false as const, cactusHazardApplied: false as const, medicalOutcome: false as const, gameplayMutation: false as const, playerVisible: false as const },
  } satisfies Omit<PlantEffectCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
