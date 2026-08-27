import { ALL_ITEMS, type ItemDefinition, type SoilId } from "../../client/src/game/data/catalog";
import { PLANT_CATALOG, PLANT_ITEMS, type PlantBiomeTag, type PlantDefinition } from "../../client/src/game/data/plantCatalog";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PLANT_CATALOG_COVERAGE_RULES_VERSION = "plant-catalog-coverage-rules.v1" as const;
export const PLANT_CATALOG_COVERAGE_GENERATOR_VERSION = "1.0.0" as const;
export const PLANT_CATALOG_COVERAGE_SCHEMA_VERSION = "a-survival.plant-catalog-coverage.v1" as const;
export const PLANT_CATALOG_COVERAGE_MAX_PLANTS = 512 as const;
export const PLANT_CATALOG_COVERAGE_MAX_SAMPLE = 64 as const;
export const PLANT_CATALOG_EXPECTED_COUNT = 300 as const;

const BIOMES: readonly PlantBiomeTag[] = ["temperate", "wetland", "tropical", "dry", "desert", "alpine", "volcanic", "arcane", "void"];
const SOILS: readonly SoilId[] = ["terra-loam", "ashen-volcanic", "red-dune", "verdant-humus", "aether-crystal"];
const STAGES = ["seed", "sprout", "young", "mature"] as const;
const PLANT_ID_PATTERN = /^plant-\d{3}$/;
const SEED_ID_PATTERN = /^seed-plant-\d{3}$/;
const MAX_SEED_STACK = 64;

type PlantCatalogCoverageIssueType = "catalog-size" | "duplicate-plant-id" | "duplicate-seed-id" | "invalid-plant-id" | "invalid-seed-id" | "missing-display" | "missing-reference" | "invalid-biome" | "missing-biome" | "invalid-soil" | "missing-soil" | "invalid-stages" | "invalid-growth" | "invalid-yield" | "invalid-effect" | "missing-asset" | "invalid-seed-item" | "missing-seed-item" | "seed-soil-mismatch" | "seed-stack-mismatch" | "distribution-gap";

export type PlantCatalogCoverageReference = {
  sourceKey: string;
  referenceType: PlantCatalogCoverageIssueType;
  referenceId: string;
  reason: string;
};

export type PlantCatalogCoverageSources = {
  plants: PlantDefinition[];
  plantItems: ItemDefinition[];
  allItems: ItemDefinition[];
};

export type PlantCatalogCoverageRecord = {
  plantId: string;
  seedItemId: string;
  family: PlantDefinition["family"];
  biomeTags: PlantBiomeTag[];
  compatibleSoils: SoilId[];
  growthStages: string[];
  growthSeconds: number;
  yieldItemId: string;
  assetId: string;
  seedStackLimit: number;
  issueTypes: PlantCatalogCoverageIssueType[];
  valid: boolean;
};

export type PlantCatalogCoverageInput = {
  seed: string;
  sampleCount?: number;
  rulesVersion?: string;
};

export type PlantCatalogCoverageOutput = {
  artifact: {
    generatorId: "plant.catalog.coverage";
    generatorVersion: typeof PLANT_CATALOG_COVERAGE_GENERATOR_VERSION;
    schemaVersion: typeof PLANT_CATALOG_COVERAGE_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    plantHash: string;
    plantItemHash: string;
    allItemHash: string;
    plantCount: number;
    plantItemCount: number;
    allItemCount: number;
    sampleCount: number;
  };
  summary: {
    plantCount: number;
    plantItemCount: number;
    allItemCount: number;
    sampleCount: number;
    validRecordCount: number;
    invalidRecordCount: number;
    uniquePlantIdCount: number;
    uniqueSeedIdCount: number;
    biomeCounts: Record<PlantBiomeTag, number>;
    soilCounts: Record<SoilId, number>;
    familyCounts: Record<PlantDefinition["family"], number>;
    effectCounts: Record<PlantDefinition["effect"]["kind"], number>;
    assetIdCounts: Record<string, number>;
    issueCounts: Record<PlantCatalogCoverageIssueType, number>;
    unresolvedReferenceCount: number;
    sampledPlantIds: string[];
  };
  records: PlantCatalogCoverageRecord[];
  unresolvedReferences: PlantCatalogCoverageReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

export function readActivePlantCatalogCoverageSources(): PlantCatalogCoverageSources {
  return {
    plants: PLANT_CATALOG.map(plant => ({ ...plant, biomeTags: [...plant.biomeTags], compatibleSoils: [...plant.compatibleSoils], growthStages: [...plant.growthStages], yieldQuantity: [...plant.yieldQuantity], effect: { ...plant.effect } })),
    plantItems: PLANT_ITEMS.map(item => ({ ...item, tags: [...item.tags] })),
    allItems: ALL_ITEMS.map(item => ({ ...item, tags: [...item.tags] })),
  };
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string): GeneratorDependency {
  return { key, kind: "plant", required: true };
}

function emptyIssueCounts(): Record<PlantCatalogCoverageIssueType, number> {
  return { "catalog-size": 0, "duplicate-plant-id": 0, "duplicate-seed-id": 0, "invalid-plant-id": 0, "invalid-seed-id": 0, "missing-display": 0, "missing-reference": 0, "invalid-biome": 0, "missing-biome": 0, "invalid-soil": 0, "missing-soil": 0, "invalid-stages": 0, "invalid-growth": 0, "invalid-yield": 0, "invalid-effect": 0, "missing-asset": 0, "invalid-seed-item": 0, "missing-seed-item": 0, "seed-soil-mismatch": 0, "seed-stack-mismatch": 0, "distribution-gap": 0 };
}

function pushReference(references: PlantCatalogCoverageReference[], issueCounts: Record<PlantCatalogCoverageIssueType, number>, sourceKey: string, referenceType: PlantCatalogCoverageIssueType, referenceId: string, reason: string) {
  issueCounts[referenceType] += 1;
  references.push({ sourceKey, referenceType, referenceId, reason });
}

function auditPlant(plant: PlantDefinition, plantItemBySeed: Map<string, ItemDefinition>, allItemById: Map<string, ItemDefinition>, references: PlantCatalogCoverageReference[], issueCounts: Record<PlantCatalogCoverageIssueType, number>): PlantCatalogCoverageRecord {
  const issueTypes: PlantCatalogCoverageIssueType[] = [];
  const add = (referenceType: PlantCatalogCoverageIssueType, reason: string) => {
    issueTypes.push(referenceType);
    pushReference(references, issueCounts, `plant-coverage:${plant.id}`, referenceType, plant.id, reason);
  };
  if (!PLANT_ID_PATTERN.test(plant.id)) add("invalid-plant-id", "plant ID must use the plant-### format");
  if (!SEED_ID_PATTERN.test(plant.seedItemId)) add("invalid-seed-id", "seed item ID must use the seed-plant-### format");
  if (plant.displayName.trim().length < 3) add("missing-display", "plant displayName is required");
  if (plant.botanicalReference.trim().length < 3 || !plant.referenceSource) add("missing-reference", "botanical reference and source are required");
  if (plant.biomeTags.length === 0) add("missing-biome", "plant must support at least one biome tag");
  if (plant.biomeTags.some(biome => !BIOMES.includes(biome))) add("invalid-biome", "plant has an unsupported biome tag");
  if (plant.compatibleSoils.length === 0) add("missing-soil", "plant must support at least one compatible soil");
  if (plant.compatibleSoils.some(soil => !SOILS.includes(soil))) add("invalid-soil", "plant has an unsupported soil");
  if (plant.growthStages.length !== STAGES.length || plant.growthStages.some((stage, index) => stage !== STAGES[index])) add("invalid-stages", "plant must expose seed/sprout/young/mature stages in order");
  if (!Number.isInteger(plant.growthSeconds) || plant.growthSeconds <= 0) add("invalid-growth", "growthSeconds must be a positive integer");
  if (!Number.isInteger(plant.yieldQuantity[0]) || !Number.isInteger(plant.yieldQuantity[1]) || plant.yieldQuantity[0] < 1 || plant.yieldQuantity[1] < plant.yieldQuantity[0]) add("invalid-yield", "yieldQuantity must be an increasing positive integer range");
  if (!Number.isFinite(plant.effect.power) || plant.effect.power <= 0) add("invalid-effect", "plant effect power must be positive");
  if (!plant.assetId.trim()) add("missing-asset", "plant must retain a logical assetId reference");
  if (plant.seedStackLimit < 1 || plant.seedStackLimit > MAX_SEED_STACK) add("seed-stack-mismatch", `seedStackLimit must be between 1 and ${MAX_SEED_STACK}`);
  const seedItem = plantItemBySeed.get(plant.seedItemId);
  const allSeedItem = allItemById.get(plant.seedItemId);
  if (!seedItem) add("missing-seed-item", "plant seedItemId has no matching PLANT_ITEMS entry");
  if (!allSeedItem || allSeedItem.category !== "seed") add("invalid-seed-item", "plant seedItemId must resolve to a seed in ALL_ITEMS");
  if (seedItem && seedItem.soilId !== plant.compatibleSoils[0]) add("seed-soil-mismatch", "PLANT_ITEMS soilId must match the plant primary compatible soil");
  if (seedItem && seedItem.stackLimit !== plant.seedStackLimit) add("seed-stack-mismatch", "PLANT_ITEMS stackLimit must match plant seedStackLimit");
  return { plantId: plant.id, seedItemId: plant.seedItemId, family: plant.family, biomeTags: [...plant.biomeTags], compatibleSoils: [...plant.compatibleSoils], growthStages: [...plant.growthStages], growthSeconds: plant.growthSeconds, yieldItemId: plant.yieldItemId, assetId: plant.assetId, seedStackLimit: plant.seedStackLimit, issueTypes: Array.from(new Set(issueTypes)).sort(compareStrings), valid: issueTypes.length === 0 };
}

export function buildPlantCatalogCoverageDependencyGraphFromSources(input: PlantCatalogCoverageInput, sources: PlantCatalogCoverageSources): PlantCatalogCoverageOutput {
  const rulesVersion = input.rulesVersion ?? PLANT_CATALOG_COVERAGE_RULES_VERSION;
  if (rulesVersion !== PLANT_CATALOG_COVERAGE_RULES_VERSION) throw new Error(`Unsupported plant catalog coverage rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  if (sources.plants.length === 0 || sources.plants.length > PLANT_CATALOG_COVERAGE_MAX_PLANTS) throw new Error(`plants must contain 1–${PLANT_CATALOG_COVERAGE_MAX_PLANTS} definitions`);
  if (sources.plantItems.length > PLANT_CATALOG_COVERAGE_MAX_PLANTS) throw new Error(`plantItems must contain at most ${PLANT_CATALOG_COVERAGE_MAX_PLANTS} definitions`);
  const sampleCount = input.sampleCount ?? 48;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > PLANT_CATALOG_COVERAGE_MAX_SAMPLE) throw new Error(`sampleCount must be an integer from 1 to ${PLANT_CATALOG_COVERAGE_MAX_SAMPLE}`);
  const sortedPlants = [...sources.plants].sort((left, right) => compareStrings(left.id, right.id));
  const plantItemBySeed = new Map(sources.plantItems.map(item => [item.id, item]));
  const allItemById = new Map(sources.allItems.map(item => [item.id, item]));
  const plantIds = new Set(sortedPlants.map(plant => plant.id));
  const seedIds = new Set(sortedPlants.map(plant => plant.seedItemId));
  const duplicatePlantIds = new Set(sortedPlants.filter((plant, index) => sortedPlants.findIndex(candidate => candidate.id === plant.id) !== index).map(plant => plant.id));
  const duplicateSeedIds = new Set(sortedPlants.filter((plant, index) => sortedPlants.findIndex(candidate => candidate.seedItemId === plant.seedItemId) !== index).map(plant => plant.seedItemId));
  const references: PlantCatalogCoverageReference[] = [];
  const issueCounts = emptyIssueCounts();
  if (sortedPlants.length !== PLANT_CATALOG_EXPECTED_COUNT) pushReference(references, issueCounts, "plant-catalog", "catalog-size", "plant-catalog", `expected ${PLANT_CATALOG_EXPECTED_COUNT} plant definitions, received ${sortedPlants.length}`);
  if (duplicatePlantIds.size > 0) for (const id of Array.from(duplicatePlantIds)) pushReference(references, issueCounts, "plant-catalog", "duplicate-plant-id", id, "plant ID is duplicated");
  if (duplicateSeedIds.size > 0) for (const id of Array.from(duplicateSeedIds)) pushReference(references, issueCounts, "plant-catalog", "duplicate-seed-id", id, "seed item ID is duplicated");
  const samplePlants = sortedPlants.slice(0, sampleCount);
  const records = samplePlants.map(plant => auditPlant(plant, plantItemBySeed, allItemById, references, issueCounts));
  const biomeCounts = Object.fromEntries(BIOMES.map(biome => [biome, sortedPlants.filter(plant => plant.biomeTags.includes(biome)).length])) as Record<PlantBiomeTag, number>;
  const soilCounts = Object.fromEntries(SOILS.map(soil => [soil, sortedPlants.filter(plant => plant.compatibleSoils.includes(soil)).length])) as Record<SoilId, number>;
  const familyCounts = Object.fromEntries(["crop", "herb", "flower", "tree", "fungus", "crystal"].map(family => [family, sortedPlants.filter(plant => plant.family === family).length])) as PlantCatalogCoverageOutput["summary"]["familyCounts"];
  const effectCounts = Object.fromEntries(["food", "healing", "repellent", "aether", "crafting"].map(kind => [kind, sortedPlants.filter(plant => plant.effect.kind === kind).length])) as PlantCatalogCoverageOutput["summary"]["effectCounts"];
  const assetIdCounts = Object.fromEntries(Array.from(new Set(sortedPlants.map(plant => plant.assetId))).sort(compareStrings).map(assetId => [assetId, sortedPlants.filter(plant => plant.assetId === assetId).length]));
  for (const biome of BIOMES) if (biomeCounts[biome] === 0) pushReference(references, issueCounts, "plant-distribution", "distribution-gap", biome, "required biome has no plant coverage");
  for (const soil of SOILS) if (soilCounts[soil] === 0) pushReference(references, issueCounts, "plant-distribution", "distribution-gap", soil, "required soil has no plant coverage");
  const plantHash = hashStableJson(sortedPlants as never);
  const plantItemHash = hashStableJson([...sources.plantItems].sort((left, right) => compareStrings(left.id, right.id)) as never);
  const allItemHash = hashStableJson([...sources.allItems].sort((left, right) => compareStrings(left.id, right.id)) as never);
  const contentHash = hashStableJson({ generatorId: "plant.catalog.coverage", generatorVersion: PLANT_CATALOG_COVERAGE_GENERATOR_VERSION, schemaVersion: PLANT_CATALOG_COVERAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, plantHash, plantItemHash, allItemHash, sampleCount } as never);
  const catalogNode: DependencyGraphNode = { key: `plant-catalog:${plantHash}`, kind: "plant", generatorId: "plant.catalog", generatorVersion: PLANT_CATALOG_COVERAGE_GENERATOR_VERSION, schemaVersion: "a-survival.plant-catalog.v1", seed: input.seed, rulesVersion, contentHash: plantHash, dependencies: [] };
  const sampleNodes = records.map(record => {
    const node: DependencyGraphNode = { key: `plant-catalog-coverage:${record.plantId}`, kind: "plant", generatorId: "plant.catalog.coverage", generatorVersion: PLANT_CATALOG_COVERAGE_GENERATOR_VERSION, schemaVersion: PLANT_CATALOG_COVERAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash: hashStableJson(record as never), dependencies: [dependencyFor(catalogNode)] };
    if (!record.valid) node.dependencies.push(missingDependency(`plant-catalog-coverage-blocker:${record.plantId}`));
    return node;
  });
  const rootNode: DependencyGraphNode = { key: `plant-catalog-coverage-root:${contentHash}`, kind: "plant", generatorId: "plant.catalog.coverage", generatorVersion: PLANT_CATALOG_COVERAGE_GENERATOR_VERSION, schemaVersion: PLANT_CATALOG_COVERAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, dependencies: sampleNodes.map(dependencyFor) };
  if (references.length > 0) rootNode.dependencies.push(missingDependency(`plant-catalog-coverage-blocker:${contentHash}`));
  const nodes = [catalogNode, ...sampleNodes, rootNode].sort((left, right) => compareStrings(left.key, right.key));
  const unresolvedReferenceCount = references.length;
  return {
    artifact: { generatorId: "plant.catalog.coverage", generatorVersion: PLANT_CATALOG_COVERAGE_GENERATOR_VERSION, schemaVersion: PLANT_CATALOG_COVERAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, plantHash, plantItemHash, allItemHash, plantCount: sortedPlants.length, plantItemCount: sources.plantItems.length, allItemCount: sources.allItems.length, sampleCount: records.length },
    summary: { plantCount: sortedPlants.length, plantItemCount: sources.plantItems.length, allItemCount: sources.allItems.length, sampleCount: records.length, validRecordCount: records.filter(record => record.valid).length, invalidRecordCount: records.filter(record => !record.valid).length, uniquePlantIdCount: plantIds.size, uniqueSeedIdCount: seedIds.size, biomeCounts, soilCounts, familyCounts, effectCounts, assetIdCounts, issueCounts, unresolvedReferenceCount, sampledPlantIds: records.map(record => record.plantId) },
    records,
    unresolvedReferences: references.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function buildPlantCatalogCoverageDependencyGraph(input: PlantCatalogCoverageInput): PlantCatalogCoverageOutput {
  return buildPlantCatalogCoverageDependencyGraphFromSources(input, readActivePlantCatalogCoverageSources());
}
