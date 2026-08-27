import { createStarterInstance, getItemDefinition, type SoilId } from "../../client/src/game/data/catalog";
import {
  createDefaultWorldFarmState,
  getWorldFarmCropStage,
  harvestWorldPlant,
  isWorldFarmSoilAllowed,
  normalizeWorldFarmState,
  planHarvestWorldPlant,
  planPlantWorldSeed,
  plantWorldSeed,
  type WorldFarmCropStage,
  type WorldFarmState,
} from "../../client/src/game/systems/worldFarmSystem";
import {
  WORLD_FARM_DEFAULT_GROWTH_MS,
  WORLD_PLANT_CATALOG,
  getWorldPlantBySeed,
  validateWorldPlantCatalog,
  type WorldPlantDefinition,
} from "../../client/src/game/tools/plantCatalogGenerator";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const WORLD_FARM_PLACEMENT_GRAPH_RULES_VERSION = "world-farm-placement-graph-rules.v1" as const;
export const WORLD_FARM_PLACEMENT_GRAPH_SCHEMA_VERSION = "a-survival.world-farm-placement-graph.v1" as const;
export const WORLD_FARM_PLACEMENT_GRAPH_VERSION = "1.0.0" as const;
export const WORLD_FARM_FIXED_NOW = 20_000;

const PLAYABLE_MAP_ID = "obsidian-frontier" as const;
const ALL_SOILS: readonly SoilId[] = ["terra-loam", "ashen-volcanic", "red-dune", "verdant-humus", "aether-crystal"];
const ALLOWED_SOILS: readonly SoilId[] = ["terra-loam", "ashen-volcanic"];
const STAGES: readonly WorldFarmCropStage[] = ["empty", "seed", "sprout", "young", "mature"];
const DEFAULT_SEED_DEFINITION_ID = "seed-001" as const;

export type WorldFarmPlacementGrowthBlocker =
  | "farm-block-surface-owner-missing"
  | "farm-world-distribution-owner-missing"
  | "farm-persistence-caller-owner-missing";

export type WorldFarmPlacementGrowthDependencyGraphInput = {
  mapId?: string;
  seedDefinitionId?: string;
  now?: number;
  rulesVersion?: string;
};

export type WorldFarmPlacementGrowthSummary = {
  mapId: string;
  catalog: {
    expectedCount: 300;
    actualCount: number;
    valid: boolean;
    issueCount: number;
    biomeIds: string[];
    soilIds: SoilId[];
    soilCounts: Record<SoilId, number>;
    playableSoilPlantCount: number;
    closedSoilPlantCount: number;
    seedLinksValid: boolean;
    harvestLinksValid: boolean;
    growthDurationsValid: boolean;
  };
  farmPlots: {
    plotCount: number;
    plotIds: string[];
    coordinateKeys: string[];
    soilIds: SoilId[];
    boundedToPlayableMap: boolean;
    allowedSoilPlotCount: number;
  };
  selectedPlant: {
    seedDefinitionId: string;
    plantId: string;
    soilId: SoilId;
    biomeId: string;
    harvestDefinitionId: string;
    growthDurationMs: number;
  };
  stagePolicy: {
    stages: WorldFarmCropStage[];
    snapshots: Array<{ label: "empty" | "seed" | "sprout" | "young" | "mature"; now: number; stage: WorldFarmCropStage }>;
    matureOnlyHarvest: boolean;
    growthDurationBounded: boolean;
  };
  placementPreview: {
    accepted: boolean;
    occupiedRejected: boolean;
    wrongSoilRejected: boolean;
    futureMapRejected: boolean;
    seedDefinitionLinkValid: boolean;
    plantDefinitionLinkValid: boolean;
    actionType: "plant-world-seed" | undefined;
    writesPerformed: false;
  };
  inventoryPreview: {
    accepted: boolean;
    consumedExactlyOne: boolean;
    rejectedPlacementKeepsInventory: boolean;
    writesPerformed: false;
  };
  harvestPreview: {
    tooEarlyRejected: boolean;
    matureAccepted: boolean;
    rewardDefinitionId: string | undefined;
    clearedPlot: boolean;
    actionType: "harvest-world-crop" | undefined;
    writesPerformed: false;
  };
  normalizationPreview: {
    boundedPlotCount: number;
    unknownPlantRemoved: boolean;
    foreignPlotRemoved: boolean;
    writesPerformed: false;
  };
  owners: {
    plantCatalog: true;
    farmPlotState: true;
    placementPolicy: true;
    growthPolicy: true;
    harvestPolicy: true;
    blockSurface: false;
    worldDistribution: false;
    persistenceCaller: false;
    playerUi: false;
  };
  blockerCodes: WorldFarmPlacementGrowthBlocker[];
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
};

export type WorldFarmPlacementGrowthDependencyGraphOutput = {
  artifact: {
    generatorId: "world.farm.placement-growth.audit";
    generatorVersion: typeof WORLD_FARM_PLACEMENT_GRAPH_VERSION;
    mapId: string;
    seedDefinitionId: string;
    contentHash: string;
  };
  summary: WorldFarmPlacementGrowthSummary;
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function sourceNode(key: string, generatorId: string, kind: DependencyGraphNode["kind"], source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind,
    generatorId,
    generatorVersion: WORLD_FARM_PLACEMENT_GRAPH_VERSION,
    schemaVersion: WORLD_FARM_PLACEMENT_GRAPH_SCHEMA_VERSION,
    seed: PLAYABLE_MAP_ID,
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function missingDependency(key: string): GeneratorDependency {
  return { key, kind: "other", required: true, generatorId: key.replace(/^owner:/, ""), generatorVersion: "1.0.0" };
}

function chooseSeedDefinition(seedDefinitionId?: string): { seedDefinitionId: string; plant: WorldPlantDefinition } {
  const requestedSeedDefinitionId = seedDefinitionId ?? DEFAULT_SEED_DEFINITION_ID;
  const plant = requestedSeedDefinitionId ? getWorldPlantBySeed(requestedSeedDefinitionId) : undefined;
  if (!plant) throw new Error("seedDefinitionId must resolve to a canonical world plant");
  if (!ALLOWED_SOILS.includes(plant.soilId)) throw new Error(`seedDefinitionId must use an allowed Obsidian soil: ${ALLOWED_SOILS.join(", ")}`);
  return { seedDefinitionId: requestedSeedDefinitionId!, plant };
}

function coordinateKey(coordinate: { x: number; y: number; z: number }) {
  return `${coordinate.x}:${coordinate.y}:${coordinate.z}`;
}

function getStages(plot: Parameters<typeof getWorldFarmCropStage>[0], now: number): WorldFarmPlacementGrowthSummary["stagePolicy"]["snapshots"] {
  const growthDurationMs = plot.growthDurationMs ?? WORLD_FARM_DEFAULT_GROWTH_MS;
  return [
    { label: "empty" as const, now: now - 1, stage: getWorldFarmCropStage({ ...plot, plantId: undefined, plantedAt: undefined, growthDurationMs: undefined }, now - 1) },
    { label: "seed" as const, now, stage: getWorldFarmCropStage(plot, now) },
    { label: "sprout" as const, now: now + growthDurationMs * 0.3, stage: getWorldFarmCropStage(plot, now + growthDurationMs * 0.3) },
    { label: "young" as const, now: now + growthDurationMs * 0.7, stage: getWorldFarmCropStage(plot, now + growthDurationMs * 0.7) },
    { label: "mature" as const, now: now + growthDurationMs, stage: getWorldFarmCropStage(plot, now + growthDurationMs) },
  ];
}

export function buildWorldFarmPlacementGrowthDependencyGraph(input: WorldFarmPlacementGrowthDependencyGraphInput = {}): WorldFarmPlacementGrowthDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_FARM_PLACEMENT_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_FARM_PLACEMENT_GRAPH_RULES_VERSION) throw new Error(`Unsupported world farm placement graph rules version: ${rulesVersion}`);
  const mapId = input.mapId ?? PLAYABLE_MAP_ID;
  const now = input.now ?? WORLD_FARM_FIXED_NOW;
  if (!Number.isInteger(now) || now < 0 || now > 2_147_483_647) throw new Error("now must be a non-negative bounded integer");
  if (mapId !== PLAYABLE_MAP_ID) throw new Error(`Only ${PLAYABLE_MAP_ID} is enabled until the vertical slice is complete.`);
  const selected = chooseSeedDefinition(input.seedDefinitionId);
  const state = createDefaultWorldFarmState();
  const plot = Object.values(state).find(candidate => candidate.soilId === selected.plant.soilId) ?? Object.values(state)[0]!;
  const incompatiblePlot = Object.values(state).find(candidate => candidate.soilId !== selected.plant.soilId) ?? plot;
  const placed = planPlantWorldSeed({ mapId, state, plotId: plot.id, seedDefinitionId: selected.seedDefinitionId, seedInstanceId: `audit-${selected.seedDefinitionId}`, now });
  if (!placed.accepted || !placed.plot || !placed.plant) throw new Error("canonical compatible seed placement unexpectedly rejected");
  const occupiedRejected = planPlantWorldSeed({ mapId, state: placed.state, plotId: plot.id, seedDefinitionId: selected.seedDefinitionId, seedInstanceId: `audit-occupied-${selected.seedDefinitionId}`, now: now + 1 });
  const wrongSoilRejected = planPlantWorldSeed({ mapId, state, plotId: incompatiblePlot.id, seedDefinitionId: selected.seedDefinitionId, seedInstanceId: `audit-wrong-soil-${selected.seedDefinitionId}`, now });
  const futureMapRejected = planPlantWorldSeed({ mapId: "future-map", state, plotId: plot.id, seedDefinitionId: selected.seedDefinitionId, seedInstanceId: `audit-future-${selected.seedDefinitionId}`, now });
  const stages = getStages(placed.plot, now);
  const seedInstance = createStarterInstance(selected.seedDefinitionId, 1);
  const inventoryPlaced = plantWorldSeed({ mapId, state, inventory: [seedInstance], plotId: plot.id, seedInstanceId: seedInstance.instanceId, now });
  const rejectedInventory = plantWorldSeed({ mapId, state, inventory: [seedInstance], plotId: incompatiblePlot.id, seedInstanceId: seedInstance.instanceId, now });
  if (!inventoryPlaced.accepted || !inventoryPlaced.plot) throw new Error("canonical inventory-backed placement unexpectedly rejected");
  const tooEarlyHarvest = planHarvestWorldPlant({ mapId, state: inventoryPlaced.state, plotId: plot.id, now: now + 1 });
  const matureNow = now + inventoryPlaced.plot.growthDurationMs!;
  const matureHarvest = harvestWorldPlant({ mapId, state: inventoryPlaced.state, inventory: [], plotId: plot.id, now: matureNow });
  const normalized = normalizeWorldFarmState({ ...state, "farm-plot-01": { plantId: "unknown-plant", seedDefinitionId: selected.seedDefinitionId, updatedAt: 1 }, "foreign-plot": { plantId: selected.plant.id } });
  const catalogValidation = validateWorldPlantCatalog(WORLD_PLANT_CATALOG);
  const soilCounts = Object.fromEntries(ALL_SOILS.map(soil => [soil, WORLD_PLANT_CATALOG.filter(plant => plant.soilId === soil).length])) as Record<SoilId, number>;
  const catalogPlantIds = new Set(WORLD_PLANT_CATALOG.map(plant => plant.id));
  const catalogSeedLinksValid = WORLD_PLANT_CATALOG.every(plant => getWorldPlantBySeed(plant.seedDefinitionId)?.id === plant.id && getItemDefinition(plant.seedDefinitionId)?.category === "seed");
  const catalogHarvestLinksValid = WORLD_PLANT_CATALOG.every(plant => Boolean(getItemDefinition(plant.harvestDefinitionId)));
  const growthDurationsValid = WORLD_PLANT_CATALOG.every(plant => Number.isInteger(plant.growthDurationMs) && plant.growthDurationMs > 0);
  const blockers: WorldFarmPlacementGrowthBlocker[] = ["farm-block-surface-owner-missing", "farm-world-distribution-owner-missing", "farm-persistence-caller-owner-missing"];
  const summary: WorldFarmPlacementGrowthSummary = {
    mapId,
    catalog: {
      expectedCount: 300,
      actualCount: WORLD_PLANT_CATALOG.length,
      valid: catalogValidation.valid,
      issueCount: catalogValidation.issues.length,
      biomeIds: Array.from(new Set(WORLD_PLANT_CATALOG.map(plant => plant.biomeId))).sort(),
      soilIds: Array.from(new Set(WORLD_PLANT_CATALOG.map(plant => plant.soilId))).sort() as SoilId[],
      soilCounts,
      playableSoilPlantCount: WORLD_PLANT_CATALOG.filter(plant => ALLOWED_SOILS.includes(plant.soilId)).length,
      closedSoilPlantCount: WORLD_PLANT_CATALOG.filter(plant => !ALLOWED_SOILS.includes(plant.soilId)).length,
      seedLinksValid: catalogSeedLinksValid,
      harvestLinksValid: catalogHarvestLinksValid,
      growthDurationsValid,
    },
    farmPlots: {
      plotCount: Object.keys(state).length,
      plotIds: Object.keys(state),
      coordinateKeys: Object.values(state).map(candidate => coordinateKey(candidate.coordinate)),
      soilIds: Object.values(state).map(candidate => candidate.soilId),
      boundedToPlayableMap: true,
      allowedSoilPlotCount: Object.values(state).filter(candidate => isWorldFarmSoilAllowed(mapId, candidate.soilId)).length,
    },
    selectedPlant: { seedDefinitionId: selected.seedDefinitionId, plantId: selected.plant.id, soilId: selected.plant.soilId, biomeId: selected.plant.biomeId, harvestDefinitionId: selected.plant.harvestDefinitionId, growthDurationMs: selected.plant.growthDurationMs },
    stagePolicy: { stages: [...STAGES], snapshots: stages, matureOnlyHarvest: !tooEarlyHarvest.accepted && matureHarvest.accepted, growthDurationBounded: WORLD_PLANT_CATALOG.every(plant => plant.growthDurationMs <= 2_147_483_647) },
    placementPreview: { accepted: placed.accepted, occupiedRejected: !occupiedRejected.accepted, wrongSoilRejected: !wrongSoilRejected.accepted, futureMapRejected: !futureMapRejected.accepted, seedDefinitionLinkValid: getWorldPlantBySeed(selected.seedDefinitionId)?.id === selected.plant.id, plantDefinitionLinkValid: selected.plant.id === placed.plant.id, actionType: placed.action?.type === "plant-world-seed" ? placed.action.type : undefined, writesPerformed: false },
    inventoryPreview: { accepted: inventoryPlaced.accepted, consumedExactlyOne: inventoryPlaced.accepted && inventoryPlaced.inventory.length === 0, rejectedPlacementKeepsInventory: !rejectedInventory.accepted && rejectedInventory.inventory.length === 1 && rejectedInventory.inventory[0]?.instanceId === seedInstance.instanceId, writesPerformed: false },
    harvestPreview: { tooEarlyRejected: !tooEarlyHarvest.accepted, matureAccepted: matureHarvest.accepted, rewardDefinitionId: matureHarvest.reward?.definitionId, clearedPlot: matureHarvest.accepted && !matureHarvest.state[plot.id]?.plantId, actionType: matureHarvest.action?.type === "harvest-world-crop" ? matureHarvest.action.type : undefined, writesPerformed: false },
    normalizationPreview: { boundedPlotCount: Object.keys(normalized).length, unknownPlantRemoved: !normalized["farm-plot-01"]?.plantId, foreignPlotRemoved: !Object.prototype.hasOwnProperty.call(normalized, "foreign-plot"), writesPerformed: false },
    owners: { plantCatalog: true, farmPlotState: true, placementPolicy: true, growthPolicy: true, harvestPolicy: true, blockSurface: false, worldDistribution: false, persistenceCaller: false, playerUi: false },
    blockerCodes: blockers,
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
  };
  const catalogNode = sourceNode("owner:farm:plant-catalog", "world.farm.plant-catalog", "plant", "client/src/game/tools/plantCatalogGenerator.ts", rulesVersion);
  const plotNode = sourceNode("owner:farm:plot-state", "world.farm.plot-state", "other", "client/src/game/systems/worldFarmSystem.ts", rulesVersion);
  const placementNode = sourceNode("owner:farm:placement", "world.farm.placement", "plant", "client/src/game/systems/worldFarmSystem.ts:planPlantWorldSeed", rulesVersion);
  const growthNode = sourceNode("owner:farm:growth", "world.farm.growth", "plant", "client/src/game/systems/worldFarmSystem.ts:getWorldFarmCropStage", rulesVersion);
  const harvestNode = sourceNode("owner:farm:harvest", "world.farm.harvest", "plant", "client/src/game/systems/worldFarmSystem.ts:planHarvestWorldPlant", rulesVersion);
  const dependencies = [catalogNode, plotNode, placementNode, growthNode, harvestNode].map(dependencyFor);
  dependencies.push(missingDependency("owner:farm:block-surface"), missingDependency("owner:farm:world-distribution"), missingDependency("owner:farm:persistence-caller"));
  const auditNode: DependencyGraphNode = { key: `world-farm-placement-growth:${mapId}:${selected.seedDefinitionId}:${now}`, kind: "plant", generatorId: "world.farm.placement-growth.audit", generatorVersion: WORLD_FARM_PLACEMENT_GRAPH_VERSION, schemaVersion: WORLD_FARM_PLACEMENT_GRAPH_SCHEMA_VERSION, seed: `${mapId}:${selected.seedDefinitionId}:${now}`, rulesVersion, contentHash: hashStableJson({ summary, dependencies } as never), dependencies };
  const nodes = [catalogNode, plotNode, placementNode, growthNode, harvestNode, auditNode];
  return { artifact: { generatorId: "world.farm.placement-growth.audit", generatorVersion: WORLD_FARM_PLACEMENT_GRAPH_VERSION, mapId, seedDefinitionId: selected.seedDefinitionId, contentHash: auditNode.contentHash }, summary, nodes, graph: validateGeneratorDependencyGraph(nodes) };
}

export function getDefaultWorldFarmPlacementGrowthDependencyGraphInput(): WorldFarmPlacementGrowthDependencyGraphInput {
  return { mapId: PLAYABLE_MAP_ID, seedDefinitionId: DEFAULT_SEED_DEFINITION_ID, now: WORLD_FARM_FIXED_NOW };
}
