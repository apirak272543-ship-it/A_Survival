import { getItemDefinition, type ItemDefinition } from "@/game/data/catalog";
import { getPlantDefinition, PLANT_CATALOG } from "@/game/data/plantCatalog";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PLANT_SEED_RETURN_GENERATOR_ID = "plant-seed-return-audit";
export const PLANT_SEED_RETURN_GENERATOR_VERSION = "1.0.0";
export const PLANT_SEED_RETURN_RULES_VERSION = "f06.v1";
export const PLANT_SEED_RETURN_MAX_SAMPLE_COUNT = PLANT_CATALOG.length;
export const PLANT_SEED_RETURN_MAX_QUANTITY = 64;

export type PlantSeedReturnInput = {
  seed: string;
  sampleCount?: number;
};

export type PlantSeedReturnSource = {
  plantId: string;
  seedDefinitionId: string;
  harvestDefinitionId: string;
  returnedSeedDefinitionId?: string;
  returnedSeedQuantity?: number;
  harvestProvenanceType: "harvest" | "drop" | "craft" | "reward" | "starter";
  replantable: boolean;
  atomicConsumeRequired: boolean;
};

export type PlantSeedReturnSources = {
  plants: readonly PlantSeedReturnSource[];
  itemDefinitions: readonly ItemDefinition[];
};

export type PlantSeedReturnIssueCode =
  | "catalog-size"
  | "duplicate-plant-id"
  | "invalid-plant-id"
  | "seed-link-missing"
  | "seed-link-mismatch"
  | "seed-definition-missing"
  | "seed-category-invalid"
  | "harvest-link-mismatch"
  | "harvest-definition-missing"
  | "return-seed-missing"
  | "return-seed-mismatch"
  | "return-seed-definition-missing"
  | "return-seed-category-invalid"
  | "return-quantity-invalid"
  | "provenance-invalid"
  | "replantable-false"
  | "atomic-consume-required";

export type PlantSeedReturnSummary = {
  catalogCount: number;
  sampleCount: number;
  uniquePlantIdCount: number;
  validRecordCount: number;
  invalidRecordCount: number;
  seedLinkedCount: number;
  harvestLinkedCount: number;
  returnedSeedCount: number;
  replantableCount: number;
  atomicConsumeRequiredCount: number;
  missingReturnSeedCount: number;
  itemDefinitionCount: number;
  issueCounts: Record<string, number>;
  behavior: {
    returnMustBeHarvestProvenance: true;
    returnedSeedMustMatchPlantedSeed: true;
    returnedSeedMustBeReplantable: true;
    plantingConsumeMustBeAtomic: true;
    outputIsAuditOnly: true;
  };
  sourceContentHash: string;
};

export type PlantSeedReturnAudit = {
  artifact: GeneratorArtifact<PlantSeedReturnInput, PlantSeedReturnSummary>;
  graph: DependencyGraphValidation;
  summary: PlantSeedReturnSummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function canonicalPlant(plantId: string) {
  return getPlantDefinition(plantId);
}

function itemById(itemDefinitions: readonly ItemDefinition[], itemId: string | undefined) {
  if (!itemId) return undefined;
  return itemDefinitions.find(item => item.id === itemId) ?? getItemDefinition(itemId);
}

function auditRecord(record: PlantSeedReturnSource, itemDefinitions: readonly ItemDefinition[], issueCodes: PlantSeedReturnIssueCode[]) {
  const plant = canonicalPlant(record.plantId);
  if (!/^plant-\d{3}$/.test(record.plantId)) issueCodes.push("invalid-plant-id");
  if (!plant) issueCodes.push("seed-link-missing");
  if (plant && record.seedDefinitionId !== plant.seedItemId) issueCodes.push("seed-link-mismatch");
  const seed = itemById(itemDefinitions, record.seedDefinitionId);
  if (!seed) issueCodes.push("seed-definition-missing");
  else if (seed.category !== "seed") issueCodes.push("seed-category-invalid");
  if (!plant || record.harvestDefinitionId !== plant.yieldItemId) issueCodes.push("harvest-link-mismatch");
  const harvest = itemById(itemDefinitions, record.harvestDefinitionId);
  if (!harvest) issueCodes.push("harvest-definition-missing");
  if (record.returnedSeedDefinitionId === undefined) issueCodes.push("return-seed-missing");
  else {
    if (record.returnedSeedDefinitionId !== record.seedDefinitionId) issueCodes.push("return-seed-mismatch");
    const returnedSeed = itemById(itemDefinitions, record.returnedSeedDefinitionId);
    if (!returnedSeed) issueCodes.push("return-seed-definition-missing");
    else if (returnedSeed.category !== "seed") issueCodes.push("return-seed-category-invalid");
  }
  const returnQuantity = record.returnedSeedQuantity;
  if (!Number.isInteger(returnQuantity) || (returnQuantity ?? 0) < 1 || (returnQuantity ?? 0) > PLANT_SEED_RETURN_MAX_QUANTITY) issueCodes.push("return-quantity-invalid");
  if (record.harvestProvenanceType !== "harvest") issueCodes.push("provenance-invalid");
  if (!record.replantable) issueCodes.push("replantable-false");
  if (!record.atomicConsumeRequired) issueCodes.push("atomic-consume-required");
}

function makeArtifact(input: PlantSeedReturnInput, summary: PlantSeedReturnSummary): GeneratorArtifact<PlantSeedReturnInput, PlantSeedReturnSummary> {
  const artifact: GeneratorArtifact<PlantSeedReturnInput, PlantSeedReturnSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: PLANT_SEED_RETURN_GENERATOR_ID,
    generatorVersion: PLANT_SEED_RETURN_GENERATOR_VERSION,
    kind: "plant",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: PLANT_SEED_RETURN_GENERATOR_ID,
      generatorVersion: PLANT_SEED_RETURN_GENERATOR_VERSION,
      seed: input.seed,
      source: "backend-generator",
      generatedAt: 0,
    },
  };
  artifact.contentHash = calculateGeneratorContentHash(artifact);
  return artifact;
}

function makeNode(input: { key: string; kind: GeneratorKind; contentHash: string; dependencies?: GeneratorDependency[] }): DependencyGraphNode {
  return {
    key: input.key,
    kind: input.kind,
    generatorId: PLANT_SEED_RETURN_GENERATOR_ID,
    generatorVersion: PLANT_SEED_RETURN_GENERATOR_VERSION,
    schemaVersion: PLANT_SEED_RETURN_RULES_VERSION,
    seed: "f06",
    rulesVersion: PLANT_SEED_RETURN_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: PlantSeedReturnInput): Required<PlantSeedReturnInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("F-06 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? PLANT_SEED_RETURN_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > PLANT_SEED_RETURN_MAX_SAMPLE_COUNT) throw new Error(`F-06 sampleCount must be an integer from 1 to ${PLANT_SEED_RETURN_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActivePlantSeedReturnSources(): PlantSeedReturnSources {
  return {
    plants: PLANT_CATALOG.map(plant => ({
      plantId: plant.id,
      seedDefinitionId: plant.seedItemId,
      harvestDefinitionId: plant.yieldItemId,
      harvestProvenanceType: "harvest",
      replantable: false,
      atomicConsumeRequired: true,
    })),
    itemDefinitions: PLANT_CATALOG.map(plant => getItemDefinition(plant.seedItemId)).filter((item): item is ItemDefinition => Boolean(item)),
  };
}

export function buildPlantSeedReturnDependencyGraphFromSources(input: PlantSeedReturnInput, sources: PlantSeedReturnSources): PlantSeedReturnAudit {
  const normalizedInput = normalizeInput(input);
  const plants = Array.from(sources.plants);
  const itemDefinitions = Array.from(sources.itemDefinitions);
  const sampledPlants = plants.slice(0, normalizedInput.sampleCount);
  const issueCounts: Record<string, number> = {};
  const plantIds = new Set<string>();
  const plantIssueKeys: Array<{ key: string; codes: PlantSeedReturnIssueCode[] }> = [];
  let validRecordCount = 0;
  let seedLinkedCount = 0;
  let harvestLinkedCount = 0;
  let returnedSeedCount = 0;
  let replantableCount = 0;
  let atomicConsumeRequiredCount = 0;
  let missingReturnSeedCount = 0;

  if (plants.length !== PLANT_CATALOG.length) increment(issueCounts, "catalog-size");
  for (const record of plants) {
    const issueCodes: PlantSeedReturnIssueCode[] = [];
    if (plantIds.has(record.plantId)) issueCodes.push("duplicate-plant-id");
    plantIds.add(record.plantId);
    const plant = canonicalPlant(record.plantId);
    if (plant && record.seedDefinitionId === plant.seedItemId) seedLinkedCount += 1;
    if (plant && record.harvestDefinitionId === plant.yieldItemId && itemById(itemDefinitions, record.harvestDefinitionId)) harvestLinkedCount += 1;
    if (record.returnedSeedDefinitionId !== undefined) returnedSeedCount += 1;
    else missingReturnSeedCount += 1;
    if (record.replantable) replantableCount += 1;
    if (record.atomicConsumeRequired) atomicConsumeRequiredCount += 1;
    auditRecord(record, itemDefinitions, issueCodes);
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length === 0) validRecordCount += 1;
    else plantIssueKeys.push({ key: `plant-seed-return:${record.plantId}`, codes: issueCodes });
  }
  if (plants.length !== PLANT_CATALOG.length) plantIssueKeys.push({ key: "catalog:f06", codes: ["catalog-size"] });

  const nodes: DependencyGraphNode[] = sampledPlants.map(record => makeNode({ key: `plant-seed-return:${record.plantId}`, kind: "plant", contentHash: hashStableJson(record as unknown as JsonValue) }));
  const rootDependencies: GeneratorDependency[] = sampledPlants.map(record => ({
    key: `plant-seed-return:${record.plantId}`,
    kind: "plant",
    required: true,
    generatorId: PLANT_SEED_RETURN_GENERATOR_ID,
    generatorVersion: PLANT_SEED_RETURN_GENERATOR_VERSION,
    contentHash: hashStableJson(record as unknown as JsonValue),
  }));
  const blockerCodes = plantIssueKeys.flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:f06:${blockerCode}`, kind: "other", required: true });

  const summary: PlantSeedReturnSummary = {
    catalogCount: plants.length,
    sampleCount: sampledPlants.length,
    uniquePlantIdCount: plantIds.size,
    validRecordCount,
    invalidRecordCount: plants.length - validRecordCount,
    seedLinkedCount,
    harvestLinkedCount,
    returnedSeedCount,
    replantableCount,
    atomicConsumeRequiredCount,
    missingReturnSeedCount,
    itemDefinitionCount: itemDefinitions.length,
    issueCounts,
    behavior: {
      returnMustBeHarvestProvenance: true,
      returnedSeedMustMatchPlantedSeed: true,
      returnedSeedMustBeReplantable: true,
      plantingConsumeMustBeAtomic: true,
      outputIsAuditOnly: true,
    },
    sourceContentHash: hashStableJson({ plants, itemDefinitions } as unknown as JsonValue),
  };
  const root = makeNode({
    key: "plant-seed-return:f06",
    kind: "plant",
    contentHash: hashStableJson(summary as unknown as JsonValue),
    dependencies: rootDependencies,
  });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildPlantSeedReturnDependencyGraph(input: PlantSeedReturnInput = { seed: "plant-seed-return-f06" }): PlantSeedReturnAudit {
  return buildPlantSeedReturnDependencyGraphFromSources(input, readActivePlantSeedReturnSources());
}
