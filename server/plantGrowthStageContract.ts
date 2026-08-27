import { hashStableJson } from "./generators/commonGeneratorApi";
import { getWorldPlantStage, type WorldPlantStage, type WorldPlantState } from "../client/src/game/systems/worldFarmingSystem";

export const PLANT_GROWTH_STAGE_SCHEMA_VERSION = "a-survival.plant-growth-stage.v1" as const;
export const PLANT_GROWTH_STAGE_CONTRACT_VERSION = "1.0.0" as const;

const MIN_GROWTH_DURATION_MS = 30_000;
const MAX_GROWTH_DURATION_MS = 30 * 60 * 1_000;
const MAX_TIME_MS = Number.MAX_SAFE_INTEGER;
const STAGE_THRESHOLDS = {
  seedUntil: 0.25,
  sproutUntil: 0.55,
  youngUntil: 1,
} as const;

export type PlantGrowthStageContractInput = {
  state: unknown;
  now?: unknown;
};

type PlantGrowthIssueCode =
  | "STATE_NOT_OBJECT"
  | "PLANTED_AT_NORMALIZED"
  | "GROWTH_DURATION_NORMALIZED"
  | "NOW_DEFAULTED_TO_PLANTED_AT"
  | "NOW_NORMALIZED"
  | "IDENTIFIER_DEFAULTED"
  | "SEED_NORMALIZED";

type PlantGrowthIssue = {
  code: PlantGrowthIssueCode;
  field: string;
  detail: string;
};

export type PlantGrowthStageContractReport = {
  schemaVersion: typeof PLANT_GROWTH_STAGE_SCHEMA_VERSION;
  contractVersion: typeof PLANT_GROWTH_STAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  state: {
    key: string;
    plantId: string;
    seedItemId: string;
    plantedAt: number;
    growthDurationMs: number;
    seed: number;
  };
  now: number;
  elapsedMs: number;
  progress: number;
  stage: WorldPlantStage;
  thresholdsMs: {
    seedUntil: number;
    sproutUntil: number;
    matureAt: number;
  };
  matureOnlyRewardGate: {
    eligible: boolean;
    rewardCreated: false;
    rewardGranted: false;
    harvestMutationApplied: false;
  };
  issues: PlantGrowthIssue[];
  blockers: [
    {
      id: "durable-time-rehydration";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "mature-harvest-integration";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "browser-device-playtest";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
  ];
  claims: {
    growthSimulation: false;
    rewardCreation: false;
    rewardGrant: false;
    harvestMutation: false;
    storageWrite: false;
    playerVisible: false;
  };
  contentSha256: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function finiteBounded(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.floor(finiteBounded(value, fallback, min, max));
}

function nonEmptyString(value: unknown, fallback: string, field: string, issues: PlantGrowthIssue[]) {
  if (typeof value === "string" && value.trim().length > 0) return value;
  issues.push({ code: "IDENTIFIER_DEFAULTED", field, detail: `${field} must be a non-empty string; deterministic placeholder was used for read-only projection` });
  return fallback;
}

function buildBlockers(): PlantGrowthStageContractReport["blockers"] {
  return [
    {
      id: "durable-time-rehydration",
      required: true,
      status: "missing-evidence",
      reason: "this contract evaluates caller-provided timestamps only; it does not persist or restore a plant state",
    },
    {
      id: "mature-harvest-integration",
      required: true,
      status: "missing-evidence",
      reason: "mature eligibility is projected as a boolean gate; no reward is created, granted, or consumed",
    },
    {
      id: "browser-device-playtest",
      required: true,
      status: "missing-evidence",
      reason: "no browser, device, offline, reload, or gameplay playtest is performed by this server-side contract",
    },
  ];
}

export function buildPlantGrowthStageContract(input: PlantGrowthStageContractInput): PlantGrowthStageContractReport {
  const issues: PlantGrowthIssue[] = [];
  const stateInput = isRecord(input.state) ? input.state : {};
  if (!isRecord(input.state)) issues.push({ code: "STATE_NOT_OBJECT", field: "state", detail: "state must be a non-null object; stage-critical fields were normalized for a read-only projection" });

  const plantedAt = boundedInteger(stateInput.plantedAt, 0, 0, MAX_TIME_MS);
  if (plantedAt !== stateInput.plantedAt) issues.push({ code: "PLANTED_AT_NORMALIZED", field: "state.plantedAt", detail: "plantedAt was normalized to a non-negative safe integer timestamp" });
  const growthDurationMs = boundedInteger(stateInput.growthDurationMs, MIN_GROWTH_DURATION_MS, MIN_GROWTH_DURATION_MS, MAX_GROWTH_DURATION_MS);
  if (growthDurationMs !== stateInput.growthDurationMs) issues.push({ code: "GROWTH_DURATION_NORMALIZED", field: "state.growthDurationMs", detail: `growthDurationMs was bounded to ${MIN_GROWTH_DURATION_MS}–${MAX_GROWTH_DURATION_MS}ms` });
  const now = input.now === undefined ? plantedAt : boundedInteger(input.now, plantedAt, 0, MAX_TIME_MS);
  if (input.now === undefined) issues.push({ code: "NOW_DEFAULTED_TO_PLANTED_AT", field: "now", detail: "now was omitted; plantedAt was used so the projection remains deterministic and does not read a clock" });
  else if (now !== input.now) issues.push({ code: "NOW_NORMALIZED", field: "now", detail: "now was normalized to a non-negative safe integer timestamp" });

  const key = nonEmptyString(stateInput.key, "plant-state", "state.key", issues);
  const plantId = nonEmptyString(stateInput.plantId, "plant-unknown", "state.plantId", issues);
  const seedItemId = nonEmptyString(stateInput.seedItemId, "seed-unknown", "state.seedItemId", issues);
  const seed = boundedInteger(stateInput.seed, 1, 0, MAX_TIME_MS);
  if (seed !== stateInput.seed) issues.push({ code: "SEED_NORMALIZED", field: "state.seed", detail: "seed was normalized to a non-negative safe integer" });

  const canonicalState: WorldPlantState = {
    key,
    plantId,
    seedItemId,
    x: 0,
    y: 0,
    z: 0,
    soilId: "terra-loam",
    biome: "volcanic",
    plantedAt,
    growthDurationMs,
    seed,
  };
  const elapsedMs = Math.max(0, now - plantedAt);
  const progress = Math.min(1, elapsedMs / growthDurationMs);
  const stage = getWorldPlantStage(canonicalState, now);
  const thresholdsMs = {
    seedUntil: Math.floor(growthDurationMs * STAGE_THRESHOLDS.seedUntil),
    sproutUntil: Math.floor(growthDurationMs * STAGE_THRESHOLDS.sproutUntil),
    matureAt: growthDurationMs,
  };
  const blockers = buildBlockers();
  const payload = {
    schemaVersion: PLANT_GROWTH_STAGE_SCHEMA_VERSION,
    contractVersion: PLANT_GROWTH_STAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    state: { key, plantId, seedItemId, plantedAt, growthDurationMs, seed },
    now,
    elapsedMs,
    progress,
    stage,
    thresholdsMs,
    matureOnlyRewardGate: { eligible: stage === "mature", rewardCreated: false, rewardGranted: false, harvestMutationApplied: false },
    issues,
    blockers,
    claims: { growthSimulation: false, rewardCreation: false, rewardGrant: false, harvestMutation: false, storageWrite: false, playerVisible: false },
  } satisfies Omit<PlantGrowthStageContractReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
