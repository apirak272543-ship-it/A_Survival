import { getItemDefinition } from "../../client/src/game/data/catalog";
import {
  getWorldFarmCropStage,
  planHarvestWorldPlant,
  validateWorldFarmEffect,
  OBSIDIAN_FARM_PLOTS,
  type WorldFarmPlot,
  type WorldFarmState,
  type WorldFarmCropStage,
} from "../../client/src/game/systems/worldFarmSystem";
import {
  generateWorldPlantCatalog,
  WORLD_FARM_DEFAULT_GROWTH_MS,
  WORLD_PLANT_CATALOG,
  validateWorldPlantCatalog,
  type WorldPlantDefinition,
} from "../../client/src/game/tools/plantCatalogGenerator";
import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const PLANT_GROWTH_STAGE_GRAPH_RULES_VERSION = "plant-growth-stage-graph-rules.v1" as const;
export const PLANT_GROWTH_STAGE_GENERATOR_VERSION = "1.0.0" as const;
export const PLANT_GROWTH_STAGE_SCHEMA_VERSION = "a-survival.plant-growth-stage.v1" as const;
export const PLANT_GROWTH_STAGE_MAX_SAMPLE = 64 as const;
export const PLANT_GROWTH_STAGE_MAP_ID = "obsidian-frontier" as const;

const EXPECTED_STAGES: readonly WorldFarmCropStage[] = ["seed", "sprout", "young", "mature"];
const BASE_NOW = 1_700_000_000_000;

type PlantGrowthIssueType = "catalog-integrity" | "seed-link" | "harvest-link" | "stage-boundary" | "mature-reward" | "effect-safety" | "map-scope";

export type PlantGrowthStageReference = {
  sourceKey: string;
  referenceType: PlantGrowthIssueType;
  referenceId: string;
  reason: string;
};

export type PlantGrowthStageSources = {
  plants: WorldPlantDefinition[];
  plots: ReadonlyArray<WorldFarmPlot>;
};

export type PlantGrowthStageRecord = {
  plantId: string;
  seedDefinitionId: string;
  harvestDefinitionId: string;
  growthDurationMs: number;
  observedStages: WorldFarmCropStage[];
  expectedStages: readonly WorldFarmCropStage[];
  stageBoundariesValid: boolean;
  preMatureHarvestAccepted: boolean;
  matureHarvestAccepted: boolean;
  matureOnlyReward: boolean;
  rewardDefinitionId?: string;
  rewardQuantity?: number;
  rewardProvenanceType?: string;
  issueTypes: PlantGrowthIssueType[];
  valid: boolean;
};

export type PlantGrowthStageDependencyGraphInput = {
  seed: string;
  sampleCount?: number;
  rulesVersion?: string;
};

export type PlantGrowthStageDependencyGraphOutput = {
  artifact: {
    generatorId: "plant.growth.stage";
    generatorVersion: typeof PLANT_GROWTH_STAGE_GENERATOR_VERSION;
    schemaVersion: typeof PLANT_GROWTH_STAGE_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    plantCatalogHash: string;
    plotHash: string;
    plantCount: number;
    plotCount: number;
    sampleCount: number;
  };
  summary: {
    plantCount: number;
    plotCount: number;
    sampleCount: number;
    validRecordCount: number;
    invalidRecordCount: number;
    stageBoundaryViolationCount: number;
    preMatureRewardViolationCount: number;
    matureRewardViolationCount: number;
    seedLinkViolationCount: number;
    harvestLinkViolationCount: number;
    catalogIntegrityViolationCount: number;
    effectSafetyViolationCount: number;
    mapScopeViolationCount: number;
    observedStageCounts: Record<WorldFarmCropStage, number>;
    issueCounts: Record<PlantGrowthIssueType, number>;
    unresolvedReferenceCount: number;
    sampledPlantIds: string[];
  };
  records: PlantGrowthStageRecord[];
  unresolvedReferences: PlantGrowthStageReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

export function readActivePlantGrowthStageSources(): PlantGrowthStageSources {
  return { plants: WORLD_PLANT_CATALOG.map(plant => ({ ...plant, tags: [...plant.tags], ...(plant.effect ? { effect: { ...plant.effect } } : {}) })), plots: OBSIDIAN_FARM_PLOTS.map(plot => ({ ...plot, coordinate: { ...plot.coordinate } })) };
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

function emptyIssueCounts(): Record<PlantGrowthIssueType, number> {
  return { "catalog-integrity": 0, "seed-link": 0, "harvest-link": 0, "stage-boundary": 0, "mature-reward": 0, "effect-safety": 0, "map-scope": 0 };
}

function pushReference(references: PlantGrowthStageReference[], issueCounts: Record<PlantGrowthIssueType, number>, sourceKey: string, referenceType: PlantGrowthIssueType, referenceId: string, reason: string) {
  issueCounts[referenceType] += 1;
  references.push({ sourceKey, referenceType, referenceId, reason });
}

function farmStateFor(plant: WorldPlantDefinition, plotTemplate: WorldFarmPlot): WorldFarmState {
  const plot: WorldFarmPlot = {
    ...plotTemplate,
    plantId: plant.id,
    seedDefinitionId: plant.seedDefinitionId,
    seedInstanceId: `audit-seed-${plant.id}`,
    plantedAt: BASE_NOW,
    growthDurationMs: plant.growthDurationMs,
    updatedAt: BASE_NOW,
  };
  return { [plot.id]: plot };
}

function auditPlant(plant: WorldPlantDefinition, plotTemplate: WorldFarmPlot, references: PlantGrowthStageReference[], issueCounts: Record<PlantGrowthIssueType, number>): PlantGrowthStageRecord {
  const sourceKey = `plant-growth:${plant.id}`;
  const issueTypes: PlantGrowthIssueType[] = [];
  const add = (referenceType: PlantGrowthIssueType, reason: string) => {
    issueTypes.push(referenceType);
    pushReference(references, issueCounts, sourceKey, referenceType, plant.id, reason);
  };
  const state = farmStateFor(plant, plotTemplate);
  const plot = state[plotTemplate.id]!;
  const boundaries = [0, 0.25, 0.55, 1].map(progress => BASE_NOW + Math.floor(plant.growthDurationMs * progress));
  const observedStages = boundaries.map(now => getWorldFarmCropStage(plot, now));
  const stageBoundariesValid = observedStages.every((stage, index) => stage === EXPECTED_STAGES[index]);
  if (!stageBoundariesValid) add("stage-boundary", `expected stage sequence ${EXPECTED_STAGES.join("/")} but observed ${observedStages.join("/")}`);
  const preMaturePlan = planHarvestWorldPlant({ mapId: PLANT_GROWTH_STAGE_MAP_ID, state, plotId: plot.id, now: BASE_NOW + Math.max(0, plant.growthDurationMs - 1) });
  const maturePlan = planHarvestWorldPlant({ mapId: PLANT_GROWTH_STAGE_MAP_ID, state, plotId: plot.id, now: BASE_NOW + plant.growthDurationMs });
  const preMatureHarvestAccepted = preMaturePlan.accepted;
  const matureHarvestAccepted = maturePlan.accepted;
  const rewardDefinitionId = maturePlan.reward?.definitionId;
  const rewardQuantity = maturePlan.reward?.quantity;
  const rewardProvenanceType = maturePlan.reward?.provenance.type;
  const matureOnlyReward = !preMatureHarvestAccepted && matureHarvestAccepted && rewardDefinitionId === plant.harvestDefinitionId && Boolean(rewardQuantity && rewardQuantity > 0) && rewardProvenanceType === "harvest";
  if (preMatureHarvestAccepted) add("mature-reward", "harvest plan was accepted before the mature boundary");
  if (!matureHarvestAccepted || rewardDefinitionId !== plant.harvestDefinitionId || !rewardQuantity || rewardQuantity < 1 || rewardProvenanceType !== "harvest") add("mature-reward", "mature harvest did not produce the expected harvest reward with harvest provenance");
  if (getItemDefinition(plant.seedDefinitionId)?.category !== "seed") add("seed-link", `seed definition is missing or not category seed: ${plant.seedDefinitionId}`);
  if (!getItemDefinition(plant.harvestDefinitionId)) add("harvest-link", `harvest definition is missing: ${plant.harvestDefinitionId}`);
  if (!Number.isInteger(plant.growthDurationMs) || plant.growthDurationMs <= 0) add("stage-boundary", "growthDurationMs must be a positive integer");
  if (plant.biomeId !== PLANT_GROWTH_STAGE_MAP_ID) add("map-scope", `playable plant biome must remain ${PLANT_GROWTH_STAGE_MAP_ID}`);
  const effectValidation = validateWorldFarmEffect(plant.effect);
  if (!effectValidation.valid) add("effect-safety", effectValidation.issues.join("; "));
  return { plantId: plant.id, seedDefinitionId: plant.seedDefinitionId, harvestDefinitionId: plant.harvestDefinitionId, growthDurationMs: plant.growthDurationMs, observedStages, expectedStages: EXPECTED_STAGES, stageBoundariesValid, preMatureHarvestAccepted, matureHarvestAccepted, matureOnlyReward, ...(rewardDefinitionId ? { rewardDefinitionId } : {}), ...(rewardQuantity ? { rewardQuantity } : {}), ...(rewardProvenanceType ? { rewardProvenanceType } : {}), issueTypes: Array.from(new Set(issueTypes)).sort(compareStrings), valid: issueTypes.length === 0 };
}

export function buildPlantGrowthStageDependencyGraphFromSources(input: PlantGrowthStageDependencyGraphInput, sources: PlantGrowthStageSources): PlantGrowthStageDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? PLANT_GROWTH_STAGE_GRAPH_RULES_VERSION;
  if (rulesVersion !== PLANT_GROWTH_STAGE_GRAPH_RULES_VERSION) throw new Error(`Unsupported plant growth stage graph rules version: ${rulesVersion}`);
  if (!input.seed.trim() || input.seed.length > 128) throw new Error("seed must be 1–128 characters");
  if (sources.plants.length === 0 || sources.plants.length > 300) throw new Error("plants must contain 1–300 definitions");
  const sampleCount = input.sampleCount ?? 32;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > PLANT_GROWTH_STAGE_MAX_SAMPLE) throw new Error(`sampleCount must be an integer from 1 to ${PLANT_GROWTH_STAGE_MAX_SAMPLE}`);
  if (sources.plots.length === 0) throw new Error("plots must contain at least one plot");
  const sortedPlants = [...sources.plants].sort((left, right) => compareStrings(left.id, right.id));
  const samplePlants = sortedPlants.slice(0, sampleCount);
  const plotTemplate = [...sources.plots].sort((left, right) => compareStrings(left.id, right.id))[0]!;
  const references: PlantGrowthStageReference[] = [];
  const issueCounts = emptyIssueCounts();
  const catalogValidation = validateWorldPlantCatalog(sources.plants);
  if (!catalogValidation.valid) pushReference(references, issueCounts, "plant-catalog-validation", "catalog-integrity", "world-plant-catalog", catalogValidation.issues.join("; "));
  const records = samplePlants.map(plant => auditPlant(plant, plotTemplate, references, issueCounts));
  const plantCatalogHash = hashStableJson(sortedPlants as never);
  const plotHash = hashStableJson(sources.plots as never);
  const instanceHash = hashStableJson(records as never);
  const contentHash = hashStableJson({ generatorId: "plant.growth.stage", generatorVersion: PLANT_GROWTH_STAGE_GENERATOR_VERSION, schemaVersion: PLANT_GROWTH_STAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, plantCatalogHash, plotHash, instanceHash, sampleCount } as never);
  const catalogNode: DependencyGraphNode = { key: `plant-catalog:${plantCatalogHash}`, kind: "plant", generatorId: "plant.catalog", generatorVersion: PLANT_GROWTH_STAGE_GENERATOR_VERSION, schemaVersion: "a-survival.world-plant-catalog.v1", seed: input.seed, rulesVersion, contentHash: plantCatalogHash, dependencies: [] };
  const sampleNodes = records.map(record => {
    const node: DependencyGraphNode = { key: `plant-growth:${record.plantId}`, kind: "plant", generatorId: "plant.growth.stage", generatorVersion: PLANT_GROWTH_STAGE_GENERATOR_VERSION, schemaVersion: PLANT_GROWTH_STAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash: hashStableJson(record as never), dependencies: [dependencyFor(catalogNode)] };
    if (!record.valid) node.dependencies.push(missingDependency(`plant-growth-blocker:${record.plantId}`));
    return node;
  });
  const rootNode: DependencyGraphNode = { key: `plant-growth-root:${contentHash}`, kind: "plant", generatorId: "plant.growth.stage", generatorVersion: PLANT_GROWTH_STAGE_GENERATOR_VERSION, schemaVersion: PLANT_GROWTH_STAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, dependencies: sampleNodes.map(dependencyFor) };
  if (references.length > 0) rootNode.dependencies.push(missingDependency(`plant-growth-blocker:${contentHash}`));
  const nodes = [catalogNode, ...sampleNodes, rootNode].sort((left, right) => compareStrings(left.key, right.key));
  const observedStageCounts = Object.fromEntries(["empty", ...EXPECTED_STAGES].map(stage => [stage, records.filter(record => record.observedStages.includes(stage as WorldFarmCropStage)).length])) as Record<WorldFarmCropStage, number>;
  const unresolvedReferenceCount = references.length;
  return {
    artifact: { generatorId: "plant.growth.stage", generatorVersion: PLANT_GROWTH_STAGE_GENERATOR_VERSION, schemaVersion: PLANT_GROWTH_STAGE_SCHEMA_VERSION, seed: input.seed, rulesVersion, contentHash, plantCatalogHash, plotHash, plantCount: sources.plants.length, plotCount: sources.plots.length, sampleCount: records.length },
    summary: { plantCount: sources.plants.length, plotCount: sources.plots.length, sampleCount: records.length, validRecordCount: records.filter(record => record.valid).length, invalidRecordCount: records.filter(record => !record.valid).length, stageBoundaryViolationCount: issueCounts["stage-boundary"], preMatureRewardViolationCount: records.filter(record => record.preMatureHarvestAccepted).length, matureRewardViolationCount: issueCounts["mature-reward"], seedLinkViolationCount: issueCounts["seed-link"], harvestLinkViolationCount: issueCounts["harvest-link"], catalogIntegrityViolationCount: issueCounts["catalog-integrity"], effectSafetyViolationCount: issueCounts["effect-safety"], mapScopeViolationCount: issueCounts["map-scope"], observedStageCounts, issueCounts, unresolvedReferenceCount, sampledPlantIds: records.map(record => record.plantId) },
    records,
    unresolvedReferences: references.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function buildPlantGrowthStageDependencyGraph(input: PlantGrowthStageDependencyGraphInput): PlantGrowthStageDependencyGraphOutput {
  return buildPlantGrowthStageDependencyGraphFromSources(input, readActivePlantGrowthStageSources());
}

export const DEFAULT_WORLD_PLANT_CATALOG_FOR_AUDIT = generateWorldPlantCatalog();
export const DEFAULT_WORLD_FARM_PLOTS_FOR_AUDIT = OBSIDIAN_FARM_PLOTS;
export const DEFAULT_GROWTH_DURATION_FOR_AUDIT = WORLD_FARM_DEFAULT_GROWTH_MS;
