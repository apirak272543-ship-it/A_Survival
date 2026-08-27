import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph, CONTENT_CATALOG_RULES_VERSION } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { buildWorldStructureDependencyGraph } from "./worldStructureDependencyGraph";
import { DEFAULT_GENERATOR_MAP_ID, generateWorld, WORLD_GENERATOR_VERSION } from "../../tools/world-generator";
import { getBlockDefinition, type BlockDefinition, type WorldBlock } from "../../client/src/game/data/blockModules";
import { STRUCTURE_BLUEPRINT_LIBRARY } from "./structureGenerator";

export const STRUCTURE_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION = "structure-block-content-catalog-graph-rules.v1" as const;
export const STRUCTURE_BLOCK_CONTENT_CATALOG_MAP_ID = DEFAULT_GENERATOR_MAP_ID;

export type StructureBlockContentCatalogDependencyGraphInput = {
  seed: string;
  radius?: number;
  blueprintIds?: string[];
  sampleBlockCount?: number;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type UnresolvedStructureBlockReference = {
  sourceKey: string;
  referenceType: "asset" | "drop-definition" | "block-item-definition" | "child-blueprint";
  referenceId: string;
  reason: string;
};

export type StructureBlockContentCatalogDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    worldHash: string;
    structureHash: string;
    catalogHash: string;
    worldGeneratorVersion: string;
    structureGeneratorVersion: string;
    catalogGeneratorVersion: string;
    structureCount: number;
    sampledBlockCount: number;
  };
  summary: {
    structureCount: number;
    sampledBlockCount: number;
    blockIds: string[];
    structureIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedStructureBlockReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedStructureBlockReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

const BLOCK_RUNTIME_GENERATOR_ID = "block.runtime";
const BLOCK_RUNTIME_GENERATOR_VERSION = "1.0.0";
const BLOCK_DEFINITION_SCHEMA_VERSION = "a-survival.block-definition.v1";
const STRUCTURE_BLOCK_GROUP_SCHEMA_VERSION = "a-survival.structure-block-group.v1";

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function boundedBlueprintIds(value: string[] | undefined) {
  const ids = value && value.length > 0 ? Array.from(new Set(value)).sort() : ["compound-frontier-farm", "object-frontier-lantern"];
  if (ids.length > 5) throw new Error("blueprintIds must contain at most 5 unique blueprints");
  const known = new Set(STRUCTURE_BLUEPRINT_LIBRARY.map(blueprint => blueprint.id));
  const unknown = ids.find(id => !known.has(id));
  if (unknown) throw new Error(`Unknown structure blueprint: ${unknown}`);
  return ids;
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

function appendDependency(node: DependencyGraphNode, dependency: GeneratorDependency) {
  if (!node.dependencies.some(existing => existing.key === dependency.key)) node.dependencies.push(dependency);
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

function sortedStructureBlocks(blocks: WorldBlock[], structureIds: Set<string>, sampleBlockCount: number) {
  return blocks
    .filter(block => Boolean(block.groupId && structureIds.has(block.groupId) && block.moduleId.startsWith("structure.")))
    .sort((left, right) => (left.groupId ?? "").localeCompare(right.groupId ?? "") || left.blockId.localeCompare(right.blockId) || left.key.localeCompare(right.key))
    .slice(0, sampleBlockCount);
}

function addUnresolved(list: UnresolvedStructureBlockReference[], sourceKey: string, referenceType: UnresolvedStructureBlockReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

export function buildStructureBlockContentCatalogDependencyGraph(input: StructureBlockContentCatalogDependencyGraphInput): StructureBlockContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? STRUCTURE_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION;
  if (rulesVersion !== STRUCTURE_BLOCK_CONTENT_CATALOG_GRAPH_RULES_VERSION) throw new Error(`Unsupported structure block content catalog graph rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleBlockCount = boundedInteger(input.sampleBlockCount, 24, 1, 48, "sampleBlockCount");
  const samplePerCategory = boundedInteger(input.samplePerCategory, 8, 1, 8, "samplePerCategory");
  const blueprintIds = boundedBlueprintIds(input.blueprintIds);
  const numericSeed = numericSeedFromLabel(input.seed);
  const structureGraph = buildWorldStructureDependencyGraph({ seed: input.seed, radius, blueprintIds });
  const world = generateWorld({ mapId: STRUCTURE_BLOCK_CONTENT_CATALOG_MAP_ID, seed: numericSeed, radius });
  const catalogGraph = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory, rulesVersion: CONTENT_CATALOG_RULES_VERSION });
  const catalogRoot = catalogGraph.nodes.find(node => node.key.startsWith("content-catalog:"));
  if (!catalogRoot) throw new Error("Content catalog root node is missing");
  const nodes = structureGraph.nodes.map(node => ({ ...node, dependencies: node.dependencies.map(dependency => ({ ...dependency })) }));
  const unresolvedReferences: UnresolvedStructureBlockReference[] = [];
  const blueprintById = new Map(STRUCTURE_BLUEPRINT_LIBRARY.filter(blueprint => blueprintIds.includes(blueprint.id)).map(blueprint => [blueprint.id, blueprint]));
  const nodeByKey = new Map(nodes.map(node => [node.key, node]));
  for (const blueprintId of blueprintIds) {
    const blueprint = blueprintById.get(blueprintId);
    const node = nodeByKey.get(`structure-blueprint:${blueprintId}`);
    if (!blueprint || !node) continue;
    appendDependency(node, dependencyFor(catalogRoot));
    for (const asset of blueprint.assetRefs) {
      const assetNode = catalogGraph.nodes.find(candidate => candidate.key === `asset:${asset.assetId}`);
      if (assetNode) appendDependency(node, dependencyFor(assetNode));
      else {
        appendDependency(node, missingDependency(`asset:${asset.assetId}`, "other"));
        addUnresolved(unresolvedReferences, node.key, "asset", asset.assetId, "structure blueprint asset is not represented by a generated content.catalog asset node");
      }
    }
    for (const childId of blueprint.generation.requiredChildren) {
      const childNode = nodeByKey.get(`structure-blueprint:${childId}`);
      if (childNode) appendDependency(node, dependencyFor(childNode));
      else {
        appendDependency(node, missingDependency(`structure-blueprint:${childId}`, "structure"));
        addUnresolved(unresolvedReferences, node.key, "child-blueprint", childId, "required structure child is outside the selected blueprint preview set");
      }
    }
  }
  const structureIds = new Set(world.structures.map(structure => structure.id));
  const sampledBlocks = sortedStructureBlocks(world.blocks, structureIds, sampleBlockCount);
  const structureGroupNodes: DependencyGraphNode[] = world.structures.map(structure => ({
    key: `world-structure-blocks:${structure.id}`,
    kind: "structure",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: STRUCTURE_BLOCK_GROUP_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson(structure as never),
    dependencies: [dependencyFor(nodeByKey.get(`world:${world.mapId}:${world.worldHash}`)!)],
  }));
  const structureGroupById = new Map(structureGroupNodes.map(node => [node.key.slice("world-structure-blocks:".length), node]));
  const blockIds = Array.from(new Set(sampledBlocks.map(block => block.blockId))).sort();
  const blockDefinitions = blockIds.map(blockId => getBlockDefinition(blockId)).filter((block): block is BlockDefinition => Boolean(block));
  const blockDefinitionNodes = blockDefinitions.map(block => blockDefinitionNode(block, input.seed, rulesVersion));
  const blockDefinitionById = new Map(blockDefinitionNodes.map(node => [node.key.slice("block-definition:".length), node]));
  for (const block of blockDefinitions) {
    const node = blockDefinitionById.get(block.id)!;
    const assetNode = catalogGraph.nodes.find(candidate => candidate.key === `asset:${block.assetId}`);
    if (assetNode) appendDependency(node, dependencyFor(assetNode));
    else {
      appendDependency(node, missingDependency(`asset:${block.assetId}`, "texture"));
      addUnresolved(unresolvedReferences, node.key, "asset", block.assetId, "structure block asset is not represented by a generated content.catalog asset node");
    }
    const dropNode = catalogGraph.nodes.find(candidate => candidate.key === `content:${block.dropDefinitionId}`);
    if (dropNode) appendDependency(node, dependencyFor(dropNode));
    else {
      appendDependency(node, missingDependency(`content:${block.dropDefinitionId}`, "item"));
      addUnresolved(unresolvedReferences, node.key, "drop-definition", block.dropDefinitionId, "structure block dropDefinitionId is not represented by sampled content.catalog definitions");
    }
    if (block.blockItemDefinitionId) {
      const blockItemNode = catalogGraph.nodes.find(candidate => candidate.key === `content:${block.blockItemDefinitionId}`);
      if (blockItemNode) appendDependency(node, dependencyFor(blockItemNode));
      else {
        appendDependency(node, missingDependency(`content:${block.blockItemDefinitionId}`, "structure"));
        addUnresolved(unresolvedReferences, node.key, "block-item-definition", block.blockItemDefinitionId, "runtime structure block item is not represented by generated content.catalog definition IDs");
      }
    }
  }
  const blockNodes: DependencyGraphNode[] = sampledBlocks.map(block => {
    const definitionNode = blockDefinitionById.get(block.blockId);
    const groupNode = block.groupId ? structureGroupById.get(block.groupId) : undefined;
    return {
      key: `structure-block:${block.key}`,
      kind: "other",
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: "a-survival.structure-block.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(block as never),
      dependencies: [
        ...(groupNode ? [dependencyFor(groupNode)] : []),
        ...(definitionNode ? [dependencyFor(definitionNode)] : [missingDependency(`block-definition:${block.blockId}`, "other")]),
      ],
    } satisfies DependencyGraphNode;
  });
  const graphNodes = [...catalogGraph.nodes, ...nodes, ...structureGroupNodes, ...blockDefinitionNodes, ...blockNodes];
  const unresolvedReferenceTypes = {
    asset: unresolvedReferences.filter(reference => reference.referenceType === "asset").length,
    "drop-definition": unresolvedReferences.filter(reference => reference.referenceType === "drop-definition").length,
    "block-item-definition": unresolvedReferences.filter(reference => reference.referenceType === "block-item-definition").length,
    "child-blueprint": unresolvedReferences.filter(reference => reference.referenceType === "child-blueprint").length,
  } satisfies Record<UnresolvedStructureBlockReference["referenceType"], number>;
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      worldHash: world.worldHash,
      structureHash: structureGraph.artifact.structureHash,
      catalogHash: catalogGraph.artifact.contentHash,
      worldGeneratorVersion: world.generatorVersion,
      structureGeneratorVersion: structureGraph.artifact.structureGeneratorVersion,
      catalogGeneratorVersion: catalogGraph.artifact.generatorVersion,
      structureCount: world.structures.length,
      sampledBlockCount: sampledBlocks.length,
    },
    summary: {
      structureCount: world.structures.length,
      sampledBlockCount: sampledBlocks.length,
      blockIds,
      structureIds: world.structures.map(structure => structure.id),
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
