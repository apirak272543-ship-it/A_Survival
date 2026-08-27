import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { buildContentCatalogDependencyGraph } from "./contentCatalogDependencyGraph";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { DEFAULT_GENERATOR_MAP_ID, generateWorld, WORLD_GENERATOR_VERSION, type GeneratedResourceNode, type WorldBiomeId } from "../../tools/world-generator";

export const WORLD_BIOME_RESOURCE_CONTENT_CATALOG_GRAPH_RULES_VERSION = "world-biome-resource-content-catalog-graph-rules.v1" as const;

export type WorldBiomeResourceContentCatalogDependencyGraphInput = {
  seed: string;
  radius?: number;
  sampleResourceCount?: number;
  samplePerCategory?: number;
  rulesVersion?: string;
};

export type UnresolvedWorldBiomeResourceReference = {
  sourceKey: string;
  referenceType: "biome-definition" | "resource-definition";
  referenceId: string;
  reason: string;
};

export type WorldBiomeResourceContentCatalogDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    worldHash: string;
    catalogHash: string;
    worldGeneratorVersion: string;
    catalogGeneratorVersion: string;
    biomeCount: number;
    resourceCount: number;
    sampledResourceCount: number;
  };
  summary: {
    biomeIds: WorldBiomeId[];
    resourceDefinitionIds: string[];
    biomeCellCounts: Record<WorldBiomeId, number>;
    resourceCount: number;
    sampledResourceCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedWorldBiomeResourceReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedWorldBiomeResourceReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

const WORLD_BIOME_SCHEMA_VERSION = "a-survival.world-biome.v1";
const WORLD_RESOURCE_SCHEMA_VERSION = "a-survival.world-resource.v1";

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

function numericSeedFromLabel(seed: string) {
  return Number.parseInt(hashStableJson(seed).slice(0, 8), 16) % 2_000_000_000;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function addUnresolved(list: UnresolvedWorldBiomeResourceReference[], sourceKey: string, referenceType: UnresolvedWorldBiomeResourceReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

function sampleResources(resources: GeneratedResourceNode[], sampleResourceCount: number) {
  return resources.slice().sort((left, right) => left.id.localeCompare(right.id) || left.definitionId.localeCompare(right.definitionId)).slice(0, sampleResourceCount);
}

export function buildWorldBiomeResourceContentCatalogDependencyGraph(input: WorldBiomeResourceContentCatalogDependencyGraphInput): WorldBiomeResourceContentCatalogDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_BIOME_RESOURCE_CONTENT_CATALOG_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_BIOME_RESOURCE_CONTENT_CATALOG_GRAPH_RULES_VERSION) throw new Error(`Unsupported world biome resource content catalog graph rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleResourceCount = boundedInteger(input.sampleResourceCount, 16, 1, 64, "sampleResourceCount");
  const samplePerCategory = boundedInteger(input.samplePerCategory, 8, 1, 8, "samplePerCategory");
  const world = generateWorld({ mapId: DEFAULT_GENERATOR_MAP_ID, seed: numericSeedFromLabel(input.seed), radius });
  const catalog = buildContentCatalogDependencyGraph({ seed: input.seed, samplePerCategory });
  const catalogRoot = catalog.nodes.find(node => node.key.startsWith("content-catalog:"));
  if (!catalogRoot) throw new Error("Content catalog root node is missing");
  const biomeIds = Array.from(new Set(world.terrain.map(cell => cell.biome))).sort() as WorldBiomeId[];
  const biomeCellCounts = Object.fromEntries(biomeIds.map(biome => [biome, world.terrain.filter(cell => cell.biome === biome).length])) as Record<WorldBiomeId, number>;
  const worldNode: DependencyGraphNode = {
    key: `world:${world.mapId}:${world.worldHash}`,
    kind: "world",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.generated-world.v1",
    seed: input.seed,
    rulesVersion,
    contentHash: world.worldHash,
    dependencies: [dependencyFor(catalogRoot)],
  };
  const unresolvedReferences: UnresolvedWorldBiomeResourceReference[] = [];
  const biomeNodes: DependencyGraphNode[] = biomeIds.map(biome => {
    const key = `biome:${biome}`;
    const node: DependencyGraphNode = {
      key,
      kind: "biome",
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: WORLD_BIOME_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson({ biome, cellCount: biomeCellCounts[biome] } as never),
      dependencies: [dependencyFor(worldNode)],
    };
    node.dependencies.push(missingDependency(`content:biome:${biome}`, "biome"));
    addUnresolved(unresolvedReferences, key, "biome-definition", biome, "content.catalog has no biome definition category or matching biome ID");
    return node;
  });
  const biomeById = new Map(biomeNodes.map(node => [node.key.slice("biome:".length), node]));
  const sampledResources = sampleResources(world.resources, sampleResourceCount);
  const resourceNodes: DependencyGraphNode[] = sampledResources.map(resource => {
    const key = `resource:${resource.id}`;
    const biomeNode = biomeById.get(resource.biome);
    const node: DependencyGraphNode = {
      key,
      kind: "item",
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: WORLD_RESOURCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(resource as never),
      dependencies: [
        ...(biomeNode ? [dependencyFor(biomeNode)] : [missingDependency(`biome:${resource.biome}`, "biome")]),
      ],
    };
    const catalogDefinition = catalog.nodes.find(candidate => candidate.key === `content:${resource.definitionId}`);
    if (catalogDefinition) node.dependencies.push(dependencyFor(catalogDefinition));
    else {
      node.dependencies.push(missingDependency(`content:${resource.definitionId}`, "item"));
      addUnresolved(unresolvedReferences, key, "resource-definition", resource.definitionId, `world resource definition ${resource.definitionId} is not represented by a matching content.catalog definition`);
    }
    return node;
  });
  const graphNodes = [catalogRoot, ...catalog.nodes.filter(node => node.key !== catalogRoot.key), worldNode, ...biomeNodes, ...resourceNodes];
  const unresolvedReferenceTypes = {
    "biome-definition": unresolvedReferences.filter(reference => reference.referenceType === "biome-definition").length,
    "resource-definition": unresolvedReferences.filter(reference => reference.referenceType === "resource-definition").length,
  } satisfies Record<UnresolvedWorldBiomeResourceReference["referenceType"], number>;
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      worldHash: world.worldHash,
      catalogHash: catalog.artifact.contentHash,
      worldGeneratorVersion: world.generatorVersion,
      catalogGeneratorVersion: catalog.artifact.generatorVersion,
      biomeCount: biomeIds.length,
      resourceCount: world.resources.length,
      sampledResourceCount: sampledResources.length,
    },
    summary: {
      biomeIds,
      resourceDefinitionIds: Array.from(new Set(world.resources.map(resource => resource.definitionId))).sort(),
      biomeCellCounts,
      resourceCount: world.resources.length,
      sampledResourceCount: sampledResources.length,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
