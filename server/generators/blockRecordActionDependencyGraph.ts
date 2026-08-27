import {
  OBSIDIAN_BLOCKS,
  OBSIDIAN_TREE_TEMPLATES,
  blockKey,
  getBlockDefinition,
  type BlockActionKind,
  type BlockState,
  type WorldBlock,
} from "../../client/src/game/data/blockModules";
import {
  breakBlockAt,
  getWorldBlockAt,
  normalizeWorldBlockOverrides,
  placeBlockAt,
  resolveBlockBreak,
} from "../../client/src/game/systems/blockActionSystem";
import { generateWorld, DEFAULT_GENERATOR_MAP_ID, DEFAULT_OBSIDIAN_GENERATOR_CONFIG } from "../../tools/world-generator";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const BLOCK_RECORD_ACTION_GRAPH_RULES_VERSION = "block-record-action-graph-rules.v1" as const;
export const BLOCK_RECORD_ACTION_GRAPH_SCHEMA_VERSION = "a-survival.block-record-action-graph.v1" as const;
export const BLOCK_RECORD_ACTION_GRAPH_VERSION = "1.0.0" as const;
const BLOCK_STATES: readonly BlockState[] = ["intact", "damaged", "sapling", "young", "mature", "decaying", "broken"];
const BLOCK_ACTIONS: readonly BlockActionKind[] = ["break", "chop", "harvest"];
const REQUIRED_KINDS = ["terrain", "rock", "ore", "log", "leaf", "plant", "obstacle", "liquid", "storage"] as const;
const REQUIRED_TREE_STAGES = ["sapling", "young", "mature"] as const;

export type BlockRecordActionDependencyGraphInput = {
  mapId?: string;
  seed?: number;
  radius?: number;
  rulesVersion?: string;
};

export type BlockRecordActionDependencyGraphSummary = {
  mapId: string;
  seed: number;
  radius: number;
  blockDefinitionCount: number;
  worldBlockRecordCount: number;
  knownBlockKinds: string[];
  knownActions: BlockActionKind[];
  knownStates: BlockState[];
  canonicalRecordFields: string[];
  coordinateKeyRoundTrip: boolean;
  worldRecords: {
    uniqueKeys: boolean;
    keyMatchesCoordinates: boolean;
    moduleIdsPresent: boolean;
    hitPointsWithinBounds: boolean;
    statesKnown: boolean;
    recordCount: number;
  };
  treeLeaf: {
    treeTemplateCount: number;
    hasLogAndLeafDefinitions: boolean;
    stageCoverage: Record<(typeof REQUIRED_TREE_STAGES)[number], boolean>;
    treeRecordsInWorld: boolean;
    leafRecordsInWorld: boolean;
  };
  actionPreview: {
    break: { action: "break"; accepted: boolean; removed: boolean; correctToolDrop: string | undefined; wrongToolDrop: undefined; wrongToolDropConfirmed: boolean };
    chop: { action: "chop"; accepted: boolean; removed: boolean; correctToolDrop: string | undefined };
    harvest: { action: "harvest"; accepted: boolean; removed: boolean; correctToolDrop: string | undefined };
  };
  placementPreview: {
    acceptedWithSolidSupport: boolean;
    rejectedWithoutSupport: boolean;
    rejectedWhenOccupied: boolean;
    coordinateKey: string;
    writesPerformed: false;
  };
  normalizedOverridePreview: {
    retainedRemovedCell: boolean;
    retainedKnownPlacement: boolean;
    rejectedUnknownModule: boolean;
    rejectedMalformedKey: boolean;
    writesPerformed: false;
  };
  owners: {
    blockDefinitionCatalog: true;
    worldBlockRecordSchema: true;
    blockActionSystem: true;
    treeLeafTemplates: true;
    worldGenerator: true;
    playerUi: false;
    futureMapEnablement: false;
  };
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
};

export type BlockRecordActionDependencyGraphOutput = {
  artifact: {
    generatorId: "block.record-action.audit";
    generatorVersion: typeof BLOCK_RECORD_ACTION_GRAPH_VERSION;
    mapId: string;
    seed: number;
    contentHash: string;
  };
  summary: BlockRecordActionDependencyGraphSummary;
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedSeed(value: number | undefined): number {
  const seed = value ?? DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed;
  if (!Number.isInteger(seed) || seed < -2_147_483_648 || seed > 2_147_483_647) throw new Error("seed must be a signed 32-bit integer");
  return seed;
}

function boundedRadius(value: number | undefined): number {
  const radius = value ?? 16;
  if (!Number.isInteger(radius) || radius < 4 || radius > DEFAULT_OBSIDIAN_GENERATOR_CONFIG.radius) throw new Error(`radius must be an integer between 4 and ${DEFAULT_OBSIDIAN_GENERATOR_CONFIG.radius}`);
  return radius;
}

function sourceNode(key: string, generatorId: string, kind: DependencyGraphNode["kind"], source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind,
    generatorId,
    generatorVersion: BLOCK_RECORD_ACTION_GRAPH_VERSION,
    schemaVersion: BLOCK_RECORD_ACTION_GRAPH_SCHEMA_VERSION,
    seed: DEFAULT_GENERATOR_MAP_ID,
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function makePreviewBlock(blockId: string, x: number): WorldBlock {
  const definition = getBlockDefinition(blockId);
  const hardness = Math.max(1, definition?.hardness ?? 1);
  return { key: blockKey(x, 0, 0), blockId, moduleId: blockId, x, y: 0, z: 0, state: "intact", hitPoints: hardness, maxHitPoints: hardness, solid: Boolean(definition?.solid), seed: 0 };
}

function definitionRecordFields() {
  return ["id", "assetId", "kind", "solid", "collisionShape", "action", "hardness", "requiredToolTag", "dropDefinitionId", "dropQuantity", "blockItemDefinitionId", "stage", "hazard", "requiresSupport", "gravityAffected", "canFloat"];
}

function summarizeAction<T extends "chop" | "harvest">(blockId: string, toolTag: "pickaxe" | "axe" | "shears" | undefined, expectedAction: T): { action: T; accepted: boolean; removed: boolean; correctToolDrop: string | undefined } {
  const block = makePreviewBlock(blockId, 100 + Object.keys(OBSIDIAN_BLOCKS).indexOf(blockId));
  const correct = resolveBlockBreak(block, toolTag);
  return { action: expectedAction, accepted: correct.accepted, removed: correct.removed, correctToolDrop: correct.dropDefinitionId };
}

export function buildBlockRecordActionDependencyGraph(input: BlockRecordActionDependencyGraphInput = {}): BlockRecordActionDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? BLOCK_RECORD_ACTION_GRAPH_RULES_VERSION;
  if (rulesVersion !== BLOCK_RECORD_ACTION_GRAPH_RULES_VERSION) throw new Error(`Unsupported block record/action graph rules version: ${rulesVersion}`);
  const mapId = input.mapId ?? DEFAULT_GENERATOR_MAP_ID;
  if (mapId !== DEFAULT_GENERATOR_MAP_ID) throw new Error(`Only ${DEFAULT_GENERATOR_MAP_ID} is enabled until the vertical slice is complete.`);
  const seed = boundedSeed(input.seed);
  const radius = boundedRadius(input.radius);
  const world = generateWorld({ mapId, seed, radius });
  const worldRecords = world.blocks;
  const keys = worldRecords.map(record => record.key);
  const uniqueKeys = new Set(keys).size === keys.length;
  const keyMatchesCoordinates = worldRecords.every(record => record.key === blockKey(record.x, record.y, record.z));
  const moduleIdsPresent = worldRecords.every(record => record.moduleId.trim().length > 0);
  const hitPointsWithinBounds = worldRecords.every(record => record.maxHitPoints >= 1 && record.hitPoints >= 0 && record.hitPoints <= record.maxHitPoints);
  const statesKnown = worldRecords.every(record => BLOCK_STATES.includes(record.state));
  const kinds = Array.from(new Set(Object.values(OBSIDIAN_BLOCKS).map(definition => definition.kind))).sort();
  const actions = BLOCK_ACTIONS.filter(action => Object.values(OBSIDIAN_BLOCKS).some(definition => definition.action === action));
  const treeTemplateCount = OBSIDIAN_TREE_TEMPLATES.length;
  const hasLogAndLeafDefinitions = OBSIDIAN_TREE_TEMPLATES.every(template => Boolean(getBlockDefinition(template.trunkBlockId)?.kind === "log" && getBlockDefinition(template.leafBlockId)?.kind === "leaf"));
  const stageCoverage = { sapling: OBSIDIAN_TREE_TEMPLATES.every(template => template.stageHeights.sapling >= 1), young: OBSIDIAN_TREE_TEMPLATES.every(template => template.stageHeights.young >= template.stageHeights.sapling), mature: OBSIDIAN_TREE_TEMPLATES.every(template => template.stageHeights.mature[1] >= template.stageHeights.mature[0]) };
  const treeRecordsInWorld = worldRecords.some(record => getBlockDefinition(record.blockId)?.kind === "log");
  const leafRecordsInWorld = worldRecords.some(record => getBlockDefinition(record.blockId)?.kind === "leaf");
  const breakBlock = makePreviewBlock("obstacle.obsidian.slab", 1);
  const wrongBreak = resolveBlockBreak(breakBlock, undefined);
  const actionPreview = {
    break: { action: "break" as const, accepted: wrongBreak.accepted, removed: wrongBreak.removed, correctToolDrop: resolveBlockBreak(breakBlock, "pickaxe").dropDefinitionId, wrongToolDrop: undefined, wrongToolDropConfirmed: wrongBreak.dropDefinitionId === undefined },
    chop: summarizeAction("wood.obsidian.log", "axe", "chop"),
    harvest: summarizeAction("flora.obsidian.sprout", undefined, "harvest"),
  };
  const placementCoordinate = { x: 2, y: 1, z: 2 };
  const acceptedPlacement = placeBlockAt({ moduleId: "player.placed", coordinate: placementCoordinate, supportModuleId: "terrain.ash", existingModuleId: null, overrides: {} });
  const rejectedNoSupport = placeBlockAt({ moduleId: "player.placed", coordinate: placementCoordinate, supportModuleId: null, existingModuleId: null, overrides: {} });
  const rejectedOccupied = placeBlockAt({ moduleId: "player.placed", coordinate: placementCoordinate, supportModuleId: "terrain.ash", existingModuleId: "obstacle.obsidian.slab", overrides: {} });
  const normalized = normalizeWorldBlockOverrides({ "0:0:0": null, "0:1:0": "player.placed", "bad": "player.placed", "0:2:0": "unknown.module" });
  const summary: BlockRecordActionDependencyGraphSummary = {
    mapId,
    seed,
    radius,
    blockDefinitionCount: Object.keys(OBSIDIAN_BLOCKS).length,
    worldBlockRecordCount: worldRecords.length,
    knownBlockKinds: kinds,
    knownActions: actions,
    knownStates: [...BLOCK_STATES],
    canonicalRecordFields: definitionRecordFields(),
    coordinateKeyRoundTrip: blockKey(1.4, 0.2, -2.6) === "1:0:-3",
    worldRecords: { uniqueKeys, keyMatchesCoordinates, moduleIdsPresent, hitPointsWithinBounds, statesKnown, recordCount: worldRecords.length },
    treeLeaf: { treeTemplateCount, hasLogAndLeafDefinitions, stageCoverage, treeRecordsInWorld, leafRecordsInWorld },
    actionPreview,
    placementPreview: { acceptedWithSolidSupport: acceptedPlacement.accepted, rejectedWithoutSupport: !rejectedNoSupport.accepted, rejectedWhenOccupied: !rejectedOccupied.accepted, coordinateKey: blockKey(placementCoordinate.x, placementCoordinate.y, placementCoordinate.z), writesPerformed: false },
    normalizedOverridePreview: { retainedRemovedCell: normalized["0:0:0"] === null, retainedKnownPlacement: normalized["0:1:0"] === "player.placed", rejectedUnknownModule: !Object.prototype.hasOwnProperty.call(normalized, "0:2:0"), rejectedMalformedKey: !Object.prototype.hasOwnProperty.call(normalized, "bad"), writesPerformed: false },
    owners: { blockDefinitionCatalog: true, worldBlockRecordSchema: true, blockActionSystem: true, treeLeafTemplates: true, worldGenerator: true, playerUi: false, futureMapEnablement: false },
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
  };
  const definitionsNode = sourceNode("owner:block:definitions", "block.definition.catalog", "other", "client/src/game/data/blockModules.ts", rulesVersion);
  const recordsNode = sourceNode("owner:block:world-records", "block.world.record", "world", "client/src/game/data/blockModules.ts:WorldBlock", rulesVersion);
  const actionsNode = sourceNode("owner:block:actions", "block.action.system", "other", "client/src/game/systems/blockActionSystem.ts", rulesVersion);
  const treeNode = sourceNode("owner:block:tree-leaf-templates", "block.tree-leaf.template", "other", "client/src/game/data/blockModules.ts:OBSIDIAN_TREE_TEMPLATES", rulesVersion);
  const generatorNode = sourceNode("owner:block:world-generator", "world.generator", "world", "tools/world-generator.ts", rulesVersion);
  const dependencies = [definitionsNode, recordsNode, actionsNode, treeNode, generatorNode].map(dependencyFor);
  const auditNode: DependencyGraphNode = {
    key: `block-record-action:${mapId}:${seed}:${radius}`,
    kind: "other",
    generatorId: "block.record-action.audit",
    generatorVersion: BLOCK_RECORD_ACTION_GRAPH_VERSION,
    schemaVersion: BLOCK_RECORD_ACTION_GRAPH_SCHEMA_VERSION,
    seed: String(seed),
    rulesVersion,
    contentHash: hashStableJson({ summary, dependencies } as never),
    dependencies,
  };
  const nodes = [definitionsNode, recordsNode, actionsNode, treeNode, generatorNode, auditNode];
  return { artifact: { generatorId: "block.record-action.audit", generatorVersion: BLOCK_RECORD_ACTION_GRAPH_VERSION, mapId, seed, contentHash: auditNode.contentHash }, summary, nodes, graph: validateGeneratorDependencyGraph(nodes) };
}

export function getDefaultBlockRecordActionDependencyGraphInput(): BlockRecordActionDependencyGraphInput {
  return { mapId: DEFAULT_GENERATOR_MAP_ID, seed: DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed, radius: 16 };
}
