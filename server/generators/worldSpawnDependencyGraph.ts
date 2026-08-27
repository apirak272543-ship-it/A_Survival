import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { DEFAULT_GENERATOR_MAP_ID, generateWorld, WORLD_GENERATOR_VERSION, type GeneratedSpawnPoint, type GeneratedWorld, type WorldBiomeId } from "../../tools/world-generator";

export const WORLD_SPAWN_GRAPH_RULES_VERSION = "world-spawn-graph-rules.v1" as const;

export type WorldSpawnDependencyGraphInput = {
  seed: string;
  radius?: number;
  sampleSpawnCount?: number;
  rulesVersion?: string;
};

export type UnresolvedWorldSpawnReference = {
  sourceKey: string;
  referenceType: "biome-context" | "structure-context" | "species-definition";
  referenceId: string;
  reason: string;
};

export type WorldSpawnDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    worldHash: string;
    worldGeneratorVersion: string;
    spawnCount: number;
    sampledSpawnCount: number;
  };
  summary: {
    biomeIds: WorldBiomeId[];
    structureIds: string[];
    speciesIds: string[];
    spawnCount: number;
    sampledSpawnCount: number;
    roleCounts: Record<GeneratedSpawnPoint["role"], number>;
    structureLinkedSpawnCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedWorldSpawnReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedWorldSpawnReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

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

function addUnresolved(list: UnresolvedWorldSpawnReference[], sourceKey: string, referenceType: UnresolvedWorldSpawnReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

function buildWorldNode(world: GeneratedWorld, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `world:${world.mapId}:${world.worldHash}`,
    kind: "world",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.generated-world.v1",
    seed,
    rulesVersion,
    contentHash: world.worldHash,
    dependencies: [],
  };
}

function buildBiomeNodes(world: GeneratedWorld, worldNode: DependencyGraphNode, seed: string, rulesVersion: string) {
  const biomeIds = Array.from(new Set(world.terrain.map(cell => cell.biome))).sort() as WorldBiomeId[];
  const biomeNodes = biomeIds.map(biome => ({
    key: `biome:${biome}`,
    kind: "biome" as const,
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.world-biome.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson({ biome, cellCount: world.terrain.filter(cell => cell.biome === biome).length } as never),
    dependencies: [dependencyFor(worldNode)],
  } satisfies DependencyGraphNode));
  return { biomeIds, biomeNodes };
}

function buildStructureNodes(world: GeneratedWorld, worldNode: DependencyGraphNode, biomeById: Map<string, DependencyGraphNode>, seed: string, rulesVersion: string) {
  return world.structures.map(structure => {
    const biomeNode = biomeById.get(structure.biome);
    return {
      key: `world-structure:${structure.id}`,
      kind: "structure" as const,
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: "a-survival.generated-world-structure.v1",
      seed,
      rulesVersion,
      contentHash: hashStableJson(structure as never),
      dependencies: [
        dependencyFor(worldNode),
        ...(biomeNode ? [dependencyFor(biomeNode)] : []),
      ],
    } satisfies DependencyGraphNode;
  });
}

function sampleSpawns(spawns: GeneratedSpawnPoint[], sampleSpawnCount: number) {
  return spawns.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, sampleSpawnCount);
}

function spawnNodeKind(role: GeneratedSpawnPoint["role"]): GeneratorKind {
  return role === "npc" ? "other" : "mob";
}

export function buildWorldSpawnDependencyGraph(input: WorldSpawnDependencyGraphInput): WorldSpawnDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_SPAWN_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_SPAWN_GRAPH_RULES_VERSION) throw new Error(`Unsupported world spawn graph rules version: ${rulesVersion}`);
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleSpawnCount = boundedInteger(input.sampleSpawnCount, 16, 1, 64, "sampleSpawnCount");
  const world = generateWorld({ mapId: DEFAULT_GENERATOR_MAP_ID, seed: numericSeedFromLabel(input.seed), radius });
  const worldNode = buildWorldNode(world, input.seed, rulesVersion);
  const { biomeIds, biomeNodes } = buildBiomeNodes(world, worldNode, input.seed, rulesVersion);
  const biomeById = new Map(biomeNodes.map(node => [node.key.slice("biome:".length), node]));
  const structureNodes = buildStructureNodes(world, worldNode, biomeById, input.seed, rulesVersion);
  const structureById = new Map(structureNodes.map(node => [node.key.slice("world-structure:".length), node]));
  const sampledSpawns = sampleSpawns(world.spawnPoints, sampleSpawnCount);
  const unresolvedReferences: UnresolvedWorldSpawnReference[] = [];
  const spawnNodes: DependencyGraphNode[] = sampledSpawns.map(spawn => {
    const node: DependencyGraphNode = {
      key: `spawn:${spawn.id}`,
      kind: spawnNodeKind(spawn.role),
      generatorId: "world.generator",
      generatorVersion: WORLD_GENERATOR_VERSION,
      schemaVersion: "a-survival.generated-spawn-point.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(spawn as never),
      dependencies: [],
    };
    const biomeNode = biomeById.get(spawn.biome);
    if (biomeNode) node.dependencies.push(dependencyFor(biomeNode));
    else {
      node.dependencies.push(missingDependency(`biome:${spawn.biome}`, "biome"));
      addUnresolved(unresolvedReferences, node.key, "biome-context", spawn.biome, "spawn point biome is not present in the generated terrain biome nodes");
    }
    if (spawn.structureId) {
      const structureNode = structureById.get(spawn.structureId);
      if (structureNode) node.dependencies.push(dependencyFor(structureNode));
      else {
        node.dependencies.push(missingDependency(`world-structure:${spawn.structureId}`, "structure"));
        addUnresolved(unresolvedReferences, node.key, "structure-context", spawn.structureId, "spawn point structureId is not present in the generated structure nodes");
      }
    }
    const speciesKind = spawn.role === "npc" ? "other" : "mob";
    node.dependencies.push(missingDependency(`species:${spawn.species}`, speciesKind));
    addUnresolved(unresolvedReferences, node.key, "species-definition", spawn.species, "spawn species has no registered mob/NPC generator definition in the current graph owner set");
    return node;
  });
  const roleCounts = { regular: 0, animal: 0, npc: 0, boss: 0 } satisfies Record<GeneratedSpawnPoint["role"], number>;
  for (const spawn of sampledSpawns) roleCounts[spawn.role] += 1;
  const graphNodes = [worldNode, ...biomeNodes, ...structureNodes, ...spawnNodes];
  const unresolvedReferenceTypes = {
    "biome-context": unresolvedReferences.filter(reference => reference.referenceType === "biome-context").length,
    "structure-context": unresolvedReferences.filter(reference => reference.referenceType === "structure-context").length,
    "species-definition": unresolvedReferences.filter(reference => reference.referenceType === "species-definition").length,
  } satisfies Record<UnresolvedWorldSpawnReference["referenceType"], number>;
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      worldHash: world.worldHash,
      worldGeneratorVersion: world.generatorVersion,
      spawnCount: world.spawnPoints.length,
      sampledSpawnCount: sampledSpawns.length,
    },
    summary: {
      biomeIds,
      structureIds: world.structures.map(structure => structure.id),
      speciesIds: Array.from(new Set(world.spawnPoints.map(spawn => spawn.species))).sort(),
      spawnCount: world.spawnPoints.length,
      sampledSpawnCount: sampledSpawns.length,
      roleCounts,
      structureLinkedSpawnCount: sampledSpawns.filter(spawn => Boolean(spawn.structureId)).length,
      unresolvedReferenceCount: unresolvedReferences.length,
      unresolvedReferenceTypes,
    },
    unresolvedReferences: unresolvedReferences.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.referenceType.localeCompare(right.referenceType) || left.referenceId.localeCompare(right.referenceId)),
    nodes: graphNodes,
    graph: validateGeneratorDependencyGraph(graphNodes),
  };
}
