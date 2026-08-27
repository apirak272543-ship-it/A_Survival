import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph, CONTENT_CATALOG_RULES_VERSION } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { DEFAULT_GENERATOR_MAP_ID, generateWorld, WORLD_GENERATOR_VERSION } from "../../tools/world-generator";
import { getBlockDefinition, type BlockDefinition, type WorldBlock } from "../../client/src/game/data/blockModules";

export const WORLD_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION = "world-block-content-catalog-graph-rules.v1" as const;
export const WORLD_BLOCK_CONTENT_CATALOG_MAP_ID = DEFAULT_GENERATOR_MAP_ID;

export type WorldBlockContentCatalogDependencyGraphInput = {
  seed: string;
  radius?: number;
  sampleBlockCount?: number;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type UnresolvedWorldBlockReference = {
  sourceKey: string;
  referenceType: "asset" | "drop-definition" | "block-item-definition" | "resource-definition";
  referenceId: string;
  reason: string;
};

export type WorldBlockContentCatalogDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    numericSeed: number;
    worldHash: string;
    catalogHash: string;
    worldGeneratorVersion: string;
    catalogGeneratorVersion: string;
    sampledBlockCount: number;
    resourceCount: number;
    structureCount: number;
  };
  summary: {
    worldBlockCount: number;
    sampledBlockCount: number;
    blockIds: string[];
    resourceDefinitionIds: string[];
    structureIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedWorldBlockReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedWorldBlockReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

const BLOCK_RUNTIME_GENERATOR_ID = "block.runtime";
const BLOCK_RUNTIME_GENERATOR_VERSION = "1.0.0";
const BLOCK_DEFINITION_SCHEMA_VERSION = "a-survival.block-definition.v1";
const WORLD_BLOCK_SCHEMA_VERSION = "a-survival.world-block.v1";
const WORLD_STRUCTURE_SCHEMA_VERSION = "a-survival.world-structure.v1";
const WORLD_RESOURCE_SCHEMA_VERSION = "a-survival.world-resource.v1";

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function numericSeedFromLabel(seed: string) {
  return Number.parseInt(hashStableJson(seed).slice(0, 8), 16) % 2_000_000_000;
}

function dependencyFor(target: DependencyGraphNode, required = true): GeneratorDependency {
  return { key: target.key, kind: target.kind, required, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function buildWorldNode(world: ReturnType<typeof generateWorld>, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `world:${world.mapId}:${world.worldHash}`,
    kind: "world",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.procedural-world.v1",
    seed,
    rulesVersion,
    contentHash: world.worldHash,
    dependencies: [],
  };
}

function blockDefinitionNode(block: BlockDefinition, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `block-definition:${block.id}`,
    kind: "other",
    generatorId: BLOCK_RUNTIME_GENERATOR_ID,
    generatorVersion: BLOCK_RUNTIME_GENERATOR_VERSION,
    schemaVersion: BLOCK_DEFINITION_SCHEMA_VERSION,
    seed,
    rulesVersion,
    contentHash: hashStableJson(block as never),
    dependencies: [],
  };
}

function findContentNode(nodes: DependencyGraphNode[], definitionId: string) {
  return nodes.find(node => node.key === `content:${definitionId}`);
}

function findAssetNode(nodes: DependencyGraphNode[], assetId: string) {
  return nodes.find(node => node.key === `asset:${assetId}`);
}

function sortedSampleBlocks(blocks: WorldBlock[], sampleBlockCount: number) {
  return [...blocks]
    .sort((left, right) => left.blockId.localeCompare(right.blockId) || left.key.localeCompare(right.key))
    .slice(0, sampleBlockCount);
}

function pushUnresolved(unresolvedReferences: UnresolvedWorldBlockReference[], sourceKey: string, referenceType: UnresolvedWorldBlockReference["referenceType"], referenceId: string, reason: string) {
  unresolvedReferences.push({ sourceKey, referenceType, referenceId, reason });
}

export function buildWorldBlockContentCatalogDependencyGraph(input: WorldBlockContentCatalogDependencyGraphInput): WorldBlockContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION) throw new Error(`Unsupported world block content catalog graph rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleBlockCount = boundedInteger(input.sampleBlockCount, 24, 1, 48, "sampleBlockCount");
  const samplePerCategory = boundedInteger(input.samplePerCategory, 8, 1, 8, "samplePerCategory");
  const numericSeed = numericSeedFromLabel(input.seed);
  const world = generateWorld({ mapId: WORLD_BLOCK_CONTENT_CATALOG_MAP_ID, profileId: "world-block-content-catalog-preview", seed: numericSeed, radius });
  const catalogGraph = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory, rulesVersion: CONTENT_CATALOG_RULES_VERSION });
  const catalogNodeByKey = new Map(catalogGraph.nodes.map(node => [node.key, node]));
  const worldNode = buildWorldNode(world, input.seed, rulesVersion);
  const unresolvedReferences: UnresolvedWorldBlockReference[] = [];
  const structureNodes: DependencyGraphNode[] = world.structures.slice(0, 16).map(structure => ({
    key: `world-structure:${structure.id}`,
    kind: "structure",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: WORLD_STRUCTURE_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson(structure as never),
    dependencies: [dependencyFor(worldNode)],
  }));
  const structureNodeById = new Map(structureNodes.map(node => [node.key.slice("world-structure:".length), node]));
  const sampledBlocks = sortedSampleBlocks(world.blocks, sampleBlockCount);
  const resourceBlockIds = world.resources.map(resource => resource.definitionId);
  const blockIds = Array.from(new Set([...sampledBlocks.map(block => block.blockId), ...resourceBlockIds])).sort();
  const blockDefinitions = blockIds.map(blockId => getBlockDefinition(blockId)).filter((block): block is BlockDefinition => Boolean(block));
  const missingBlockDefinitionIds = blockIds.filter(blockId => !getBlockDefinition(blockId));
  for (const blockId of missingBlockDefinitionIds) pushUnresolved(unresolvedReferences, `world-resource:${blockId}`, "resource-definition", blockId, "world generator references a block/resource definition that is not present in blockModules");
  const blockDefinitionNodes = blockDefinitions.map(block => blockDefinitionNode(block, input.seed, rulesVersion));
  const blockDefinitionById = new Map(blockDefinitionNodes.map(node => [node.key.slice("block-definition:".length), node]));

  for (const block of blockDefinitions) {
    const sourceKey = `block-definition:${block.id}`;
    const node = blockDefinitionById.get(block.id)!;
    const assetNode = findAssetNode(catalogGraph.nodes, block.assetId);
    node.dependencies.push(assetNode ? dependencyFor(assetNode) : missingDependency(`asset:${block.assetId}`, "texture"));
    if (!assetNode) pushUnresolved(unresolvedReferences, sourceKey, "asset", block.assetId, "block assetId is not represented by a content.catalog asset node");
    const dropNode = findContentNode(catalogGraph.nodes, block.dropDefinitionId);
    node.dependencies.push(dropNode ? dependencyFor(dropNode) : missingDependency(`content:${block.dropDefinitionId}`, "item"));
    if (!dropNode) pushUnresolved(unresolvedReferences, sourceKey, "drop-definition", block.dropDefinitionId, "block dropDefinitionId is not represented by the sampled content.catalog definitions");
    if (block.blockItemDefinitionId) {
      const blockItemNode = findContentNode(catalogGraph.nodes, block.blockItemDefinitionId);
      node.dependencies.push(blockItemNode ? dependencyFor(blockItemNode) : missingDependency(`content:${block.blockItemDefinitionId}`, "structure"));
      if (!blockItemNode) pushUnresolved(unresolvedReferences, sourceKey, "block-item-definition", block.blockItemDefinitionId, "runtime block item is not represented by the generated content.catalog definition IDs");
    }
  }

  const blockNodes: DependencyGraphNode[] = sampledBlocks.map(block => {
    const definitionNode = blockDefinitionById.get(block.blockId);
    const structureNode = block.groupId ? structureNodeById.get(block.groupId) : undefined;
    return {
      key: `world-block:${block.key}`,
      kind: "other",
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: WORLD_BLOCK_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(block as never),
      dependencies: [dependencyFor(worldNode), ...(definitionNode ? [dependencyFor(definitionNode)] : [missingDependency(`block-definition:${block.blockId}`, "other")]), ...(structureNode ? [dependencyFor(structureNode)] : [])],
    } satisfies DependencyGraphNode;
  });
  const resourceNodes: DependencyGraphNode[] = world.resources.slice(0, 32).map(resource => {
    const definitionNode = blockDefinitionById.get(resource.definitionId);
    return {
      key: `world-resource:${resource.id}`,
      kind: "other",
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: WORLD_RESOURCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(resource as never),
      dependencies: [dependencyFor(worldNode), ...(definitionNode ? [dependencyFor(definitionNode)] : [missingDependency(`block-definition:${resource.definitionId}`, "other")])],
    } satisfies DependencyGraphNode;
  });
  const nodes = [...catalogGraph.nodes, worldNode, ...structureNodes, ...blockDefinitionNodes, ...blockNodes, ...resourceNodes];
  const unresolvedReferenceTypes = {
    asset: unresolvedReferences.filter(reference => reference.referenceType === "asset").length,
    "drop-definition": unresolvedReferences.filter(reference => reference.referenceType === "drop-definition").length,
    "block-item-definition": unresolvedReferences.filter(reference => reference.referenceType === "block-item-definition").length,
    "resource-definition": unresolvedReferences.filter(reference => reference.referenceType === "resource-definition").length,
  } satisfies Record<UnresolvedWorldBlockReference["referenceType"], number>;
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      numericSeed,
      worldHash: world.worldHash,
      catalogHash: catalogGraph.artifact.contentHash,
      worldGeneratorVersion: world.generatorVersion,
      catalogGeneratorVersion: catalogGraph.artifact.generatorVersion,
      sampledBlockCount: sampledBlocks.length,
      resourceCount: world.resources.length,
      structureCount: world.structures.length,
    },
    summary: {
      worldBlockCount: world.blocks.length,
      sampledBlockCount: sampledBlocks.length,
      blockIds: Array.from(new Set(sampledBlocks.map(block => block.blockId))).sort(),
      resourceDefinitionIds: Array.from(new Set(world.resources.map(resource => resource.definitionId))).sort(),
      structureIds: world.structures.map(structure => structure.id).slice(0, 16),
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
