import { hashStableJson } from "./generators/commonGeneratorApi";
import { createDefaultWorldFarmState, isWorldFarmSoilAllowed, OBSIDIAN_FARM_PLOTS, planPlantWorldSeed, type WorldFarmPlot } from "../client/src/game/systems/worldFarmSystem";
import { WORLD_PLANT_CATALOG, type WorldPlantDefinition } from "../client/src/game/tools/plantCatalogGenerator";
import type { SoilId } from "../client/src/game/data/catalog";

export const WORLD_FARM_PLACEMENT_COVERAGE_SCHEMA_VERSION = "a-survival.world-farm-placement-coverage.v1" as const;
export const WORLD_FARM_PLACEMENT_COVERAGE_VERSION = "1.0.0" as const;
const PLAYABLE_MAP_ID = "obsidian-frontier" as const;
const MAX_SEED_SAMPLES = 300;
const MAX_NOW = Number.MAX_SAFE_INTEGER;
const SOIL_IDS = ["terra-loam", "ashen-volcanic", "red-dune", "verdant-humus", "aether-crystal"] as const satisfies readonly SoilId[];

type PlacementIssueCode =
  | "MAP_ID_NORMALIZED"
  | "SEED_SAMPLE_NOT_ARRAY"
  | "SEED_SAMPLE_TRUNCATED"
  | "SEED_SAMPLE_INVALID"
  | "UNRESOLVED_SEED_DEFINITION"
  | "PLOT_PROJECTION_MISMATCH";

type PlacementIssue = {
  code: PlacementIssueCode;
  detail: string;
  seedDefinitionId?: string;
  plotId?: string;
};

type PlacementRejectionCode = "unsupported-map" | "invalid-seed" | "soil-mismatch" | "occupied-plot" | "other";

export type WorldFarmPlacementCoverageInput = {
  mapId?: unknown;
  seedDefinitionIds?: unknown;
  now?: unknown;
};

export type WorldFarmPlacementCoverageReport = {
  schemaVersion: typeof WORLD_FARM_PLACEMENT_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof WORLD_FARM_PLACEMENT_COVERAGE_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  mapId: string;
  plotCount: number;
  seedSampleCount: number;
  canonicalPlayableBiomeMatches: number;
  coverage: {
    plotsBySoil: Record<SoilId, number>;
    acceptedPlacementProjectionCount: number;
    rejectedPlacementProjectionCount: number;
    rejectionReasons: Record<PlacementRejectionCode, number>;
    compatibilityMismatches: number;
  };
  issues: PlacementIssue[];
  blockers: [
    {
      id: "inventory-atomic-consume";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "authoritative-farm-persistence";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
    {
      id: "runtime-biome-distribution-playtest";
      required: true;
      status: "missing-evidence";
      reason: string;
    },
  ];
  claims: {
    inventoryMutation: false;
    rewardGrant: false;
    harvestMutation: false;
    growthMutation: false;
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

function finiteInteger(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.floor(Math.min(max, Math.max(min, value)));
}

function soilCounts() {
  return Object.fromEntries(SOIL_IDS.map(soilId => [soilId, 0])) as Record<SoilId, number>;
}

function rejectionCounts() {
  return { "unsupported-map": 0, "invalid-seed": 0, "soil-mismatch": 0, "occupied-plot": 0, other: 0 } as Record<PlacementRejectionCode, number>;
}

function classifyRejection(reason: string | undefined): PlacementRejectionCode {
  if (reason?.includes("Obsidian Frontier")) return "unsupported-map";
  if (reason?.includes("เมล็ดพืช")) return "invalid-seed";
  if (reason?.includes("ดิน")) return "soil-mismatch";
  if (reason?.includes("มีพืช")) return "occupied-plot";
  return "other";
}

function buildBlockers(): WorldFarmPlacementCoverageReport["blockers"] {
  return [
    {
      id: "inventory-atomic-consume",
      required: true,
      status: "missing-evidence",
      reason: "this contract uses planPlantWorldSeed only and never consumes an inventory item or commits an action",
    },
    {
      id: "authoritative-farm-persistence",
      required: true,
      status: "missing-evidence",
      reason: "the returned projections are in-memory audit results and do not persist farm state or offline actions",
    },
    {
      id: "runtime-biome-distribution-playtest",
      required: true,
      status: "missing-evidence",
      reason: "canonical plant biome IDs and plot-soil compatibility are counted, but world placement distribution and browser/device playtest are not run",
    },
  ];
}

function normalizePlots(): readonly WorldFarmPlot[] {
  return OBSIDIAN_FARM_PLOTS;
}

function normalizeSeedSamples(input: unknown, issues: PlacementIssue[]): string[] {
  if (input === undefined) return WORLD_PLANT_CATALOG.map(plant => plant.seedDefinitionId);
  if (!Array.isArray(input)) {
    issues.push({ code: "SEED_SAMPLE_NOT_ARRAY", detail: `seedDefinitionIds must be an array; canonical ${MAX_SEED_SAMPLES}-seed sample was used` });
    return WORLD_PLANT_CATALOG.map(plant => plant.seedDefinitionId);
  }
  if (input.length > MAX_SEED_SAMPLES) issues.push({ code: "SEED_SAMPLE_TRUNCATED", detail: `seedDefinitionIds was truncated to ${MAX_SEED_SAMPLES} entries` });
  const samples: string[] = [];
  for (const value of input.slice(0, MAX_SEED_SAMPLES)) {
    if (isNonEmptyString(value)) samples.push(value);
    else issues.push({ code: "SEED_SAMPLE_INVALID", detail: "each seedDefinitionId must be a non-empty string" });
  }
  return samples;
}

export function buildWorldFarmPlacementCoverageReport(input: WorldFarmPlacementCoverageInput = {}): WorldFarmPlacementCoverageReport {
  const issues: PlacementIssue[] = [];
  const mapId = isNonEmptyString(input.mapId) ? input.mapId : PLAYABLE_MAP_ID;
  if (input.mapId !== undefined && mapId !== PLAYABLE_MAP_ID) issues.push({ code: "MAP_ID_NORMALIZED", detail: `mapId ${mapId} is outside the playable placement scope; projections remain rejected instead of being remapped` });
  const now = finiteInteger(input.now, 0, 0, MAX_NOW);
  const seedDefinitionIds = normalizeSeedSamples(input.seedDefinitionIds, issues);
  const plots = normalizePlots();
  const state = createDefaultWorldFarmState();
  const plotsBySoil = soilCounts();
  for (const plot of plots) plotsBySoil[plot.soilId] += 1;
  const rejectionReasons = rejectionCounts();
  let acceptedPlacementProjectionCount = 0;
  let rejectedPlacementProjectionCount = 0;
  let canonicalPlayableBiomeMatches = 0;
  let compatibilityMismatches = 0;
  const canonicalPlants = new Map(WORLD_PLANT_CATALOG.map(plant => [plant.seedDefinitionId, plant]));

  for (const seedDefinitionId of seedDefinitionIds) {
    const canonicalPlant = canonicalPlants.get(seedDefinitionId);
    if (canonicalPlant?.biomeId === PLAYABLE_MAP_ID) canonicalPlayableBiomeMatches += 1;
    if (!canonicalPlant) issues.push({ code: "UNRESOLVED_SEED_DEFINITION", detail: `seedDefinitionId ${seedDefinitionId} is not present in the canonical world plant catalog`, seedDefinitionId });
    for (const plot of plots) {
      const projection = planPlantWorldSeed({ mapId, state, plotId: plot.id, seedDefinitionId, seedInstanceId: `coverage-${seedDefinitionId}`, now });
      const expectedAccepted = Boolean(canonicalPlant && mapId === PLAYABLE_MAP_ID && isWorldFarmSoilAllowed(mapId, plot.soilId) && canonicalPlant.soilId === plot.soilId);
      if (projection.accepted) acceptedPlacementProjectionCount += 1;
      else {
        rejectedPlacementProjectionCount += 1;
        rejectionReasons[classifyRejection(projection.reason)] += 1;
      }
      if (projection.accepted !== expectedAccepted) {
        compatibilityMismatches += 1;
        issues.push({ code: "PLOT_PROJECTION_MISMATCH", detail: `placement projection did not match canonical soil/map expectation for ${seedDefinitionId}`, seedDefinitionId, plotId: plot.id });
      }
    }
  }

  const blockers = buildBlockers();
  const coverage = { plotsBySoil, acceptedPlacementProjectionCount, rejectedPlacementProjectionCount, rejectionReasons, compatibilityMismatches } satisfies WorldFarmPlacementCoverageReport["coverage"];
  const payload = {
    schemaVersion: WORLD_FARM_PLACEMENT_COVERAGE_SCHEMA_VERSION,
    contractVersion: WORLD_FARM_PLACEMENT_COVERAGE_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    mapId,
    plotCount: plots.length,
    seedSampleCount: seedDefinitionIds.length,
    canonicalPlayableBiomeMatches,
    coverage,
    issues,
    blockers,
    claims: { inventoryMutation: false, rewardGrant: false, harvestMutation: false, growthMutation: false, storageWrite: false, playerVisible: false },
  } satisfies Omit<WorldFarmPlacementCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
