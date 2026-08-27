import { canPlaceBlock, getBlockDefinition, isSolidSupport, OBSIDIAN_BLOCKS, type BlockCollisionShape, type BlockDefinition } from "../client/src/game/data/blockModules";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const BLOCK_HAZARD_PLACEMENT_COVERAGE_SCHEMA_VERSION = "a-survival.block-hazard-placement-coverage.v1" as const;
export const BLOCK_HAZARD_PLACEMENT_COVERAGE_CONTRACT_VERSION = "1.0.0" as const;
const MAX_BLOCK_SAMPLES = 256;
const MAX_PLACEMENT_PROBES = 64;
const COLLISION_SHAPES = ["full", "slab", "thin", "none"] as const satisfies readonly BlockCollisionShape[];
const DEFAULT_PLACEMENT_PROBES = [
  { id: "supported-solid", moduleId: "player.placed", supportModuleId: "terrain.ash" },
  { id: "occupied-solid", moduleId: "player.placed", supportModuleId: "terrain.ash", existingModuleId: "existing.block" },
  { id: "missing-support", moduleId: "rock.obsidian.small" },
  { id: "floatable-liquid", moduleId: "water.obsidian.surface" },
  { id: "unknown-block", moduleId: "unknown.block" },
] as const;

type CoverageIssueCode =
  | "BLOCK_SAMPLE_NOT_ARRAY"
  | "BLOCK_SAMPLE_TRUNCATED"
  | "BLOCK_SAMPLE_INVALID"
  | "UNKNOWN_BLOCK_DEFINITION"
  | "PLACEMENT_PROBE_NOT_ARRAY"
  | "PLACEMENT_PROBE_TRUNCATED"
  | "PLACEMENT_PROBE_INVALID"
  | "PLACEMENT_PROBE_MISMATCH";

type CoverageIssue = {
  code: CoverageIssueCode;
  detail: string;
  blockId?: string;
  probeId?: string;
};

type PlacementProbe = {
  id: string;
  moduleId: string;
  supportModuleId?: string;
  existingModuleId?: string;
};

export type BlockHazardPlacementCoverageInput = {
  blockIds?: unknown;
  placementProbes?: unknown;
};

export type BlockHazardPlacementCoverageReport = {
  schemaVersion: typeof BLOCK_HAZARD_PLACEMENT_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof BLOCK_HAZARD_PLACEMENT_COVERAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  sampledBlockCount: number;
  canonicalBlockCount: number;
  collisionShapes: Record<BlockCollisionShape, number>;
  occupancy: {
    solidCount: number;
    nonSolidCount: number;
    partialCollisionCount: number;
    noCollisionCount: number;
  };
  support: {
    requiresSupportCount: number;
    gravityAffectedCount: number;
    canFloatCount: number;
    invalidGravityFloatCombinationCount: number;
  };
  hazards: {
    hazardBlockCount: number;
    hazardBlockIds: string[];
    maxDamage: number;
    maxCooldownSeconds: number;
    invalidHazardCount: number;
    cactus: { present: boolean; solid: boolean; collisionShape: BlockCollisionShape | null; damage: number | null; affects: string | null };
  };
  placement: {
    probeCount: number;
    acceptedCount: number;
    rejectedCount: number;
    rejectionReasons: Record<string, number>;
  };
  issues: CoverageIssue[];
  blockers: [
    {
      id: "runtime-damage-caller";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "world-occupancy-integration";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "player-hazard-playtest";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
  ];
  claims: {
    damageCaller: false;
    combatEffect: false;
    placementMutation: false;
    inventoryMutation: false;
    storageWrite: false;
    playerVisible: false;
  };
  contentSha256: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function countCollisionShapes(definitions: readonly BlockDefinition[]) {
  return Object.fromEntries(COLLISION_SHAPES.map(shape => [shape, definitions.filter(definition => definition.collisionShape === shape).length])) as Record<BlockCollisionShape, number>;
}

function normalizeBlockIds(input: unknown, issues: CoverageIssue[]) {
  if (input === undefined) return Object.keys(OBSIDIAN_BLOCKS);
  if (!Array.isArray(input)) {
    issues.push({ code: "BLOCK_SAMPLE_NOT_ARRAY", detail: `blockIds must be an array; canonical ${MAX_BLOCK_SAMPLES}-block sample was used` });
    return Object.keys(OBSIDIAN_BLOCKS);
  }
  if (input.length > MAX_BLOCK_SAMPLES) issues.push({ code: "BLOCK_SAMPLE_TRUNCATED", detail: `blockIds was truncated to ${MAX_BLOCK_SAMPLES} entries` });
  const ids: string[] = [];
  for (const value of input.slice(0, MAX_BLOCK_SAMPLES)) {
    if (!isNonEmptyString(value)) issues.push({ code: "BLOCK_SAMPLE_INVALID", detail: "each blockId must be a non-empty string" });
    else ids.push(value);
  }
  return ids;
}

function normalizeProbes(input: unknown, issues: CoverageIssue[]): PlacementProbe[] {
  if (input === undefined) return DEFAULT_PLACEMENT_PROBES.map(probe => ({ ...probe }));
  if (!Array.isArray(input)) {
    issues.push({ code: "PLACEMENT_PROBE_NOT_ARRAY", detail: "placementProbes must be an array; canonical bounded probes were used" });
    return DEFAULT_PLACEMENT_PROBES.map(probe => ({ ...probe }));
  }
  if (input.length > MAX_PLACEMENT_PROBES) issues.push({ code: "PLACEMENT_PROBE_TRUNCATED", detail: `placementProbes was truncated to ${MAX_PLACEMENT_PROBES} entries` });
  const probes: PlacementProbe[] = [];
  for (const value of input.slice(0, MAX_PLACEMENT_PROBES)) {
    if (!isRecord(value) || !isNonEmptyString(value.id) || !isNonEmptyString(value.moduleId)) {
      issues.push({ code: "PLACEMENT_PROBE_INVALID", detail: "each placement probe requires non-empty id and moduleId" });
      continue;
    }
    probes.push({
      id: value.id,
      moduleId: value.moduleId,
      ...(isNonEmptyString(value.supportModuleId) ? { supportModuleId: value.supportModuleId } : {}),
      ...(isNonEmptyString(value.existingModuleId) ? { existingModuleId: value.existingModuleId } : {}),
    });
  }
  return probes;
}

function buildBlockers(): BlockHazardPlacementCoverageReport["blockers"] {
  return [
    {
      id: "runtime-damage-caller",
      required: true,
      status: "missing-evidence",
      reason: "hazard fields are audited from canonical definitions; no player damage caller or combat effect is invoked",
    },
    {
      id: "world-occupancy-integration",
      required: true,
      status: "missing-evidence",
      reason: "placement probes call the pure canPlaceBlock decision only and never mutate a world block or occupancy store",
    },
    {
      id: "player-hazard-playtest",
      required: true,
      status: "missing-evidence",
      reason: "no browser, device, collision, thorn-contact, damage-cooldown, or multiplayer playtest is performed",
    },
  ];
}

export function buildBlockHazardPlacementCoverageReport(input: BlockHazardPlacementCoverageInput = {}): BlockHazardPlacementCoverageReport {
  const issues: CoverageIssue[] = [];
  const blockIds = normalizeBlockIds(input.blockIds, issues);
  const definitions = blockIds.flatMap(blockId => {
    const definition = getBlockDefinition(blockId);
    if (!definition) {
      issues.push({ code: "UNKNOWN_BLOCK_DEFINITION", detail: `blockId ${blockId} is not present in canonical OBSIDIAN_BLOCKS`, blockId });
      return [];
    }
    return [definition];
  });
  const collisionShapes = countCollisionShapes(definitions);
  const hazardDefinitions = definitions.filter(definition => definition.hazard !== undefined);
  const invalidHazardCount = hazardDefinitions.filter(definition => {
    const hazard = definition.hazard!;
    return !Number.isFinite(hazard.damage) || hazard.damage < 0 || !Number.isFinite(hazard.cooldownSeconds) || hazard.cooldownSeconds < 0 || !["player", "creature", "all"].includes(hazard.affects);
  }).length;
  const cactus = getBlockDefinition("flora.obsidian.thorn-cactus");
  const probes = normalizeProbes(input.placementProbes, issues);
  let acceptedCount = 0;
  let rejectedCount = 0;
  const rejectionReasons: Record<string, number> = {};
  for (const probe of probes) {
    const result = canPlaceBlock(probe.moduleId, probe.supportModuleId, probe.existingModuleId);
    const expectedAccepted = Boolean(getBlockDefinition(probe.moduleId) && !probe.existingModuleId && (getBlockDefinition(probe.moduleId)?.canFloat || isSolidSupport(probe.supportModuleId)));
    if (result.accepted) acceptedCount += 1;
    else {
      rejectedCount += 1;
      rejectionReasons[result.reason] = (rejectionReasons[result.reason] ?? 0) + 1;
    }
    if (result.accepted !== expectedAccepted) issues.push({ code: "PLACEMENT_PROBE_MISMATCH", detail: `placement probe ${probe.id} did not match canonical support/occupancy expectation`, probeId: probe.id });
  }
  const payload = {
    schemaVersion: BLOCK_HAZARD_PLACEMENT_COVERAGE_SCHEMA_VERSION,
    contractVersion: BLOCK_HAZARD_PLACEMENT_COVERAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    sampledBlockCount: definitions.length,
    canonicalBlockCount: Object.keys(OBSIDIAN_BLOCKS).length,
    collisionShapes,
    occupancy: {
      solidCount: definitions.filter(definition => definition.solid).length,
      nonSolidCount: definitions.filter(definition => !definition.solid).length,
      partialCollisionCount: definitions.filter(definition => definition.collisionShape === "slab" || definition.collisionShape === "thin").length,
      noCollisionCount: definitions.filter(definition => definition.collisionShape === "none").length,
    },
    support: {
      requiresSupportCount: definitions.filter(definition => definition.requiresSupport).length,
      gravityAffectedCount: definitions.filter(definition => definition.gravityAffected).length,
      canFloatCount: definitions.filter(definition => definition.canFloat).length,
      invalidGravityFloatCombinationCount: definitions.filter(definition => definition.gravityAffected && definition.canFloat).length,
    },
    hazards: {
      hazardBlockCount: hazardDefinitions.length,
      hazardBlockIds: hazardDefinitions.map(definition => definition.id).sort(),
      maxDamage: hazardDefinitions.reduce((maximum, definition) => Math.max(maximum, definition.hazard?.damage ?? 0), 0),
      maxCooldownSeconds: hazardDefinitions.reduce((maximum, definition) => Math.max(maximum, definition.hazard?.cooldownSeconds ?? 0), 0),
      invalidHazardCount,
      cactus: { present: Boolean(cactus), solid: cactus?.solid ?? false, collisionShape: cactus?.collisionShape ?? null, damage: cactus?.hazard?.damage ?? null, affects: cactus?.hazard?.affects ?? null },
    },
    placement: { probeCount: probes.length, acceptedCount, rejectedCount, rejectionReasons },
    issues,
    blockers: buildBlockers(),
    claims: { damageCaller: false, combatEffect: false, placementMutation: false, inventoryMutation: false, storageWrite: false, playerVisible: false },
  } satisfies Omit<BlockHazardPlacementCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
