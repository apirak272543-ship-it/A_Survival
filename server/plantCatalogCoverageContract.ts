import { hashStableJson } from "./generators/commonGeneratorApi";
import { PLANT_CATALOG, type PlantBiomeTag, type PlantDefinition, type PlantEffectKind, type PlantFamily } from "../client/src/game/data/plantCatalog";
import type { SoilId } from "../client/src/game/data/catalog";

export const PLANT_CATALOG_COVERAGE_SCHEMA_VERSION = "a-survival.plant-catalog-coverage.v1" as const;
export const CANONICAL_PLANT_CATALOG_COUNT = 300;

const BIOME_TAGS = ["temperate", "wetland", "tropical", "dry", "desert", "alpine", "volcanic", "arcane", "void"] as const satisfies readonly PlantBiomeTag[];
const SOIL_IDS = ["terra-loam", "ashen-volcanic", "red-dune", "verdant-humus", "aether-crystal"] as const satisfies readonly SoilId[];
const PLANT_FAMILIES = ["crop", "herb", "flower", "tree", "fungus", "crystal"] as const satisfies readonly PlantFamily[];
const EFFECT_KINDS = ["food", "healing", "repellent", "aether", "crafting"] as const satisfies readonly PlantEffectKind[];
const GROWTH_STAGES = ["seed", "sprout", "young", "mature"] as const;
const REFERENCE_SOURCES = ["Kew-POWO", "USDA-PLANTS", "original-game-variant"] as const;

export type PlantCatalogCoverageInput = {
  catalog?: unknown;
  expectedCount?: unknown;
};

type PlantCoverageIssueCode =
  | "CATALOG_NOT_ARRAY"
  | "EXPECTED_COUNT_NORMALIZED"
  | "CATALOG_COUNT_MISMATCH"
  | "DUPLICATE_PLANT_ID"
  | "DUPLICATE_SEED_ID"
  | "MISSING_PLANT_ID"
  | "MISSING_SEED_ID"
  | "MISSING_BIOME_TAG"
  | "UNSUPPORTED_BIOME_TAG"
  | "MISSING_SOIL"
  | "UNSUPPORTED_SOIL"
  | "UNSUPPORTED_FAMILY"
  | "UNSUPPORTED_EFFECT"
  | "MISSING_ASSET_ID"
  | "INVALID_GROWTH_STAGES"
  | "INVALID_GROWTH_DURATION"
  | "INVALID_YIELD"
  | "UNSUPPORTED_REFERENCE_SOURCE";

type PlantCoverageIssue = {
  code: PlantCoverageIssueCode;
  detail: string;
  plantId?: string;
};

type PlantCoverageBlocker = {
  id: "active-manifest-binding" | "runtime-distribution" | "growth-harvest-playtest";
  required: true;
  status: "missing-evidence";
  reason: string;
};

export type PlantCatalogCoverageReport = {
  schemaVersion: typeof PLANT_CATALOG_COVERAGE_SCHEMA_VERSION;
  auditOnly: true;
  exportOnly: true;
  publishReady: false;
  catalogCount: number;
  expectedCount: number;
  valid: boolean;
  coverage: {
    biomeTags: Record<PlantBiomeTag, number>;
    soils: Record<SoilId, number>;
    families: Record<PlantFamily, number>;
    effects: Record<PlantEffectKind, number>;
    referenceSources: Record<(typeof REFERENCE_SOURCES)[number], number>;
    growthStages: { completeFourStageRecords: number; expectedStages: readonly ["seed", "sprout", "young", "mature"] };
    assets: { recordCount: number; uniqueAssetIdCount: number; missingAssetIdCount: number };
  };
  issues: PlantCoverageIssue[];
  blockers: PlantCoverageBlocker[];
  claims: {
    binaryAssetGeneration: false;
    registryWrite: false;
    cacheWrite: false;
    runtimeImport: false;
    playerVisible: false;
    growthSimulation: false;
    harvestMutation: false;
    activeManifestBinding: false;
  };
  contentSha256: string;
};

function counts<T extends string>(values: readonly T[]): Record<T, number> {
  return Object.fromEntries(values.map(value => [value, 0])) as Record<T, number>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSupportedValue<T extends string>(values: readonly T[], value: unknown): value is T {
  return typeof value === "string" && values.includes(value as T);
}

function normalizeExpectedCount(value: unknown, issues: PlantCoverageIssue[]) {
  if (value === undefined) return CANONICAL_PLANT_CATALOG_COUNT;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= CANONICAL_PLANT_CATALOG_COUNT) return value;
  issues.push({ code: "EXPECTED_COUNT_NORMALIZED", detail: `expectedCount must be an integer from 0 to ${CANONICAL_PLANT_CATALOG_COUNT}; canonical count was used` });
  return CANONICAL_PLANT_CATALOG_COUNT;
}

function addPlantIssue(issues: PlantCoverageIssue[], code: PlantCoverageIssueCode, detail: string, plantId?: string) {
  issues.push(plantId ? { code, detail, plantId } : { code, detail });
}

function buildBlockers(): PlantCoverageBlocker[] {
  return [
    {
      id: "active-manifest-binding",
      required: true,
      status: "missing-evidence",
      reason: "this checkpoint verifies that records carry assetId values but does not bind them to the active manifest or credits registry",
    },
    {
      id: "runtime-distribution",
      required: true,
      status: "missing-evidence",
      reason: "category counts prove catalog coverage only; they do not prove biome placement or world spawn distribution",
    },
    {
      id: "growth-harvest-playtest",
      required: true,
      status: "missing-evidence",
      reason: "no browser/device growth, harvest, replant, or gameplay acceptance is run by this pure data audit",
    },
  ];
}

export function buildPlantCatalogCoverageReport(input: PlantCatalogCoverageInput = {}): PlantCatalogCoverageReport {
  const issues: PlantCoverageIssue[] = [];
  const expectedCount = normalizeExpectedCount(input.expectedCount, issues);
  const catalogValue = input.catalog === undefined ? PLANT_CATALOG : input.catalog;
  const catalog = Array.isArray(catalogValue) ? catalogValue : [];
  if (!Array.isArray(catalogValue)) addPlantIssue(issues, "CATALOG_NOT_ARRAY", "catalog must be an array; an empty catalog was audited");
  if (catalog.length !== expectedCount) addPlantIssue(issues, "CATALOG_COUNT_MISMATCH", `expected ${expectedCount} plant records, received ${catalog.length}`);

  const biomeTags = counts(BIOME_TAGS);
  const soils = counts(SOIL_IDS);
  const families = counts(PLANT_FAMILIES);
  const effects = counts(EFFECT_KINDS);
  const referenceSources = counts(REFERENCE_SOURCES);
  const plantIds = new Set<string>();
  const seedIds = new Set<string>();
  const assetIds = new Set<string>();
  let completeFourStageRecords = 0;
  let missingAssetIdCount = 0;

  for (const value of catalog) {
    const plant = isRecord(value) ? value as Partial<PlantDefinition> : {};
    const plantId = isNonEmptyString(plant.id) ? plant.id : undefined;
    if (!plantId) addPlantIssue(issues, "MISSING_PLANT_ID", "plant id must be a non-empty string");
    else if (plantIds.has(plantId)) addPlantIssue(issues, "DUPLICATE_PLANT_ID", `duplicate plant id: ${plantId}`, plantId);
    else plantIds.add(plantId);

    const seedId = isNonEmptyString(plant.seedItemId) ? plant.seedItemId : undefined;
    if (!seedId) addPlantIssue(issues, "MISSING_SEED_ID", "seedItemId must be a non-empty string", plantId);
    else if (seedIds.has(seedId)) addPlantIssue(issues, "DUPLICATE_SEED_ID", `duplicate seed item id: ${seedId}`, plantId);
    else seedIds.add(seedId);

    const plantBiomes = Array.isArray(plant.biomeTags) ? plant.biomeTags : [];
    if (plantBiomes.length === 0) addPlantIssue(issues, "MISSING_BIOME_TAG", "plant must have at least one biome tag", plantId);
    for (const biome of plantBiomes) {
      if (isSupportedValue(BIOME_TAGS, biome)) biomeTags[biome] += 1;
      else addPlantIssue(issues, "UNSUPPORTED_BIOME_TAG", `unsupported biome tag: ${String(biome)}`, plantId);
    }

    const plantSoils = Array.isArray(plant.compatibleSoils) ? plant.compatibleSoils : [];
    if (plantSoils.length === 0) addPlantIssue(issues, "MISSING_SOIL", "plant must have at least one compatible soil", plantId);
    for (const soil of plantSoils) {
      if (isSupportedValue(SOIL_IDS, soil)) soils[soil] += 1;
      else addPlantIssue(issues, "UNSUPPORTED_SOIL", `unsupported soil: ${String(soil)}`, plantId);
    }

    if (isSupportedValue(PLANT_FAMILIES, plant.family)) families[plant.family] += 1;
    else addPlantIssue(issues, "UNSUPPORTED_FAMILY", `unsupported plant family: ${String(plant.family)}`, plantId);
    if (isSupportedValue(EFFECT_KINDS, plant.effect?.kind)) effects[plant.effect.kind] += 1;
    else addPlantIssue(issues, "UNSUPPORTED_EFFECT", `unsupported plant effect: ${String(plant.effect?.kind)}`, plantId);

    if (isNonEmptyString(plant.assetId)) assetIds.add(plant.assetId);
    else {
      missingAssetIdCount += 1;
      addPlantIssue(issues, "MISSING_ASSET_ID", "plant assetId must be a non-empty string", plantId);
    }

    if (Array.isArray(plant.growthStages) && plant.growthStages.length === GROWTH_STAGES.length && plant.growthStages.every((stage, index) => stage === GROWTH_STAGES[index])) completeFourStageRecords += 1;
    else addPlantIssue(issues, "INVALID_GROWTH_STAGES", "growthStages must be exactly seed → sprout → young → mature", plantId);
    if (typeof plant.growthSeconds !== "number" || !Number.isFinite(plant.growthSeconds) || plant.growthSeconds <= 0) addPlantIssue(issues, "INVALID_GROWTH_DURATION", "growthSeconds must be finite and greater than zero", plantId);

    if (!isNonEmptyString(plant.yieldItemId) || !Array.isArray(plant.yieldQuantity) || plant.yieldQuantity.length !== 2 || !plant.yieldQuantity.every(quantity => typeof quantity === "number" && Number.isInteger(quantity) && quantity > 0)) addPlantIssue(issues, "INVALID_YIELD", "yieldItemId and two positive integer yield quantities are required", plantId);
    if (isSupportedValue(REFERENCE_SOURCES, plant.referenceSource)) referenceSources[plant.referenceSource] += 1;
    else addPlantIssue(issues, "UNSUPPORTED_REFERENCE_SOURCE", `unsupported reference source: ${String(plant.referenceSource)}`, plantId);
  }

  const coverage = {
    biomeTags,
    soils,
    families,
    effects,
    referenceSources,
    growthStages: { completeFourStageRecords, expectedStages: GROWTH_STAGES },
    assets: { recordCount: catalog.length, uniqueAssetIdCount: assetIds.size, missingAssetIdCount },
  } satisfies PlantCatalogCoverageReport["coverage"];
  const payload = {
    schemaVersion: PLANT_CATALOG_COVERAGE_SCHEMA_VERSION,
    auditOnly: true,
    exportOnly: true,
    publishReady: false,
    catalogCount: catalog.length,
    expectedCount,
    valid: issues.length === 0,
    coverage,
    issues,
    blockers: buildBlockers(),
    claims: { binaryAssetGeneration: false, registryWrite: false, cacheWrite: false, runtimeImport: false, playerVisible: false, growthSimulation: false, harvestMutation: false, activeManifestBinding: false },
  } satisfies Omit<PlantCatalogCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
