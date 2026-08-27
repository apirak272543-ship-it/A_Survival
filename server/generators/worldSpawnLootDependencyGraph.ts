import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { CONTENT_GENERATOR_VERSION, generateLootDrop, type GeneratedLoot, type ProceduralItemDefinition } from "../../tools/content-generator";
import { DEFAULT_GENERATOR_MAP_ID, generateWorld, WORLD_GENERATOR_VERSION, type GeneratedSpawnPoint, type GeneratedWorld, type WorldBiomeId } from "../../tools/world-generator";

export const WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION = "world-spawn-loot-graph-rules.v1" as const;

export type WorldSpawnLootDependencyGraphInput = {
  seed: string;
  radius?: number;
  sampleSpawnCount?: number;
  rulesVersion?: string;
};

export type UnresolvedWorldSpawnLootReference = {
  sourceKey: string;
  referenceType: "biome-context" | "structure-context" | "species-definition" | "asset-binding";
  referenceId: string;
  reason: string;
};

export type WorldSpawnLootGraphSource = {
  world: GeneratedWorld;
  sampledSpawns: GeneratedSpawnPoint[];
  lootRecords: Array<{ spawn: GeneratedSpawnPoint; sampleIndex: number; loot: GeneratedLoot }>;
  numericSeed: number;
};

export type WorldSpawnLootDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    worldHash: string;
    worldGeneratorVersion: string;
    lootGeneratorVersion: string;
    spawnCount: number;
    sampledSpawnCount: number;
    lootCount: number;
    dropCount: number;
  };
  summary: {
    biomeIds: WorldBiomeId[];
    structureIds: string[];
    speciesIds: string[];
    dropItemIds: string[];
    spawnCount: number;
    sampledSpawnCount: number;
    lootSourceSpawnCount: number;
    lootCount: number;
    dropCount: number;
    roleCounts: Record<GeneratedSpawnPoint["role"], number>;
    structureLinkedSpawnCount: number;
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<UnresolvedWorldSpawnLootReference["referenceType"], number>;
  };
  unresolvedReferences: UnresolvedWorldSpawnLootReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedInteger(value: number | undefined, fallback: number, min: number, max: number, label: string) {
  const normalized = value ?? fallback;
  if (!Number.isInteger(normalized) || normalized < min || normalized > max) throw new Error(`${label} must be an integer from ${min} to ${max}`);
  return normalized;
}

export function worldSpawnLootNumericSeed(seed: string) {
  return Number.parseInt(hashStableJson(seed).slice(0, 8), 16) % 2_000_000_000;
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return { key: target.key, kind: target.kind, required: true, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function addUnresolved(list: UnresolvedWorldSpawnLootReference[], sourceKey: string, referenceType: UnresolvedWorldSpawnLootReference["referenceType"], referenceId: string, reason: string) {
  list.push({ sourceKey, referenceType, referenceId, reason });
}

function boundedWorldNode(world: GeneratedWorld, seed: string, rulesVersion: string): DependencyGraphNode {
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
  const nodes = biomeIds.map(biome => ({
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
  return { biomeIds, nodes };
}

function buildStructureNodes(world: GeneratedWorld, worldNode: DependencyGraphNode, biomeById: Map<string, DependencyGraphNode>, seed: string, rulesVersion: string) {
  return world.structures.map(structure => ({
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
      ...(biomeById.has(structure.biome) ? [dependencyFor(biomeById.get(structure.biome)!)] : []),
    ],
  } satisfies DependencyGraphNode));
}

export function sampleWorldSpawnPoints(spawns: GeneratedSpawnPoint[], sampleSpawnCount: number) {
  return spawns.slice().sort((left, right) => left.id.localeCompare(right.id)).slice(0, sampleSpawnCount);
}

function spawnNodeKind(role: GeneratedSpawnPoint["role"]): GeneratorKind {
  return role === "npc" ? "other" : "mob";
}

export function isWorldSpawnLootSource(spawn: GeneratedSpawnPoint) {
  return spawn.role === "regular" || spawn.role === "boss";
}

export function worldSpawnLootSeed(seed: string, spawn: GeneratedSpawnPoint, index: number) {
  return worldSpawnLootNumericSeed(`${seed}:${spawn.id}:${spawn.species}:${spawn.biome}:${index}`);
}

function addSpawnNodeDependencies(node: DependencyGraphNode, spawn: GeneratedSpawnPoint, biomeById: Map<string, DependencyGraphNode>, structureById: Map<string, DependencyGraphNode>, unresolvedReferences: UnresolvedWorldSpawnLootReference[]) {
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
}

function buildLootNode(loot: GeneratedLoot, spawnNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `loot:${spawnNode.key.slice("spawn:".length)}`,
    kind: "loot",
    generatorId: "content.generator",
    generatorVersion: CONTENT_GENERATOR_VERSION,
    schemaVersion: "a-survival.generated-loot.v1",
    seed,
    rulesVersion,
    contentHash: loot.lootHash,
    dependencies: [dependencyFor(spawnNode)],
  };
}

function buildLootItemNode(item: ProceduralItemDefinition, lootNode: DependencyGraphNode, seed: string, rulesVersion: string): DependencyGraphNode {
  return {
    key: `loot-item:${lootNode.key.slice("loot:".length)}:${item.id}`,
    kind: "item",
    generatorId: "content.generator",
    generatorVersion: CONTENT_GENERATOR_VERSION,
    schemaVersion: "a-survival.procedural-item.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(item as never),
    dependencies: [dependencyFor(lootNode), missingDependency(`asset:${item.asset.assetId}`, "texture")],
  };
}

export function generateWorldSpawnLootGraphSource(input: WorldSpawnLootDependencyGraphInput): WorldSpawnLootGraphSource {
  const radius = boundedInteger(input.radius, 32, 16, 64, "radius");
  const sampleSpawnCount = boundedInteger(input.sampleSpawnCount, 16, 1, 64, "sampleSpawnCount");
  const numericSeed = worldSpawnLootNumericSeed(input.seed);
  const world = generateWorld({ mapId: DEFAULT_GENERATOR_MAP_ID, seed: numericSeed, radius });
  const sampledSpawns = sampleWorldSpawnPoints(world.spawnPoints, sampleSpawnCount);
  const lootRecords = sampledSpawns.flatMap((spawn, sampleIndex) => isWorldSpawnLootSource(spawn) ? [{ spawn, sampleIndex, loot: generateLootDrop({ seed: worldSpawnLootSeed(input.seed, spawn, sampleIndex), monsterId: spawn.species, biome: spawn.biome, isBoss: spawn.role === "boss", count: spawn.role === "boss" ? 2 : 1 }) }] : []);
  return { world, sampledSpawns, lootRecords, numericSeed };
}

export function buildWorldSpawnLootDependencyGraph(input: WorldSpawnLootDependencyGraphInput): WorldSpawnLootDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_SPAWN_LOOT_GRAPH_RULES_VERSION) throw new Error(`Unsupported world spawn loot graph rules version: ${rulesVersion}`);
  const source = generateWorldSpawnLootGraphSource(input);
  const { world, sampledSpawns, lootRecords } = source;
  const lootBySpawnId = new Map(lootRecords.map(record => [record.spawn.id, record]));
  const worldNode = boundedWorldNode(world, input.seed, rulesVersion);
  const { biomeIds, nodes: biomeNodes } = buildBiomeNodes(world, worldNode, input.seed, rulesVersion);
  const biomeById = new Map(biomeNodes.map(node => [node.key.slice("biome:".length), node]));
  const structureNodes = buildStructureNodes(world, worldNode, biomeById, input.seed, rulesVersion);
  const structureById = new Map(structureNodes.map(node => [node.key.slice("world-structure:".length), node]));
  const unresolvedReferences: UnresolvedWorldSpawnLootReference[] = [];
  const spawnNodes: DependencyGraphNode[] = [];
  const lootNodes: DependencyGraphNode[] = [];
  const lootItemNodes: DependencyGraphNode[] = [];
  const loots: GeneratedLoot[] = [];
  for (let index = 0; index < sampledSpawns.length; index += 1) {
    const spawn = sampledSpawns[index]!;
    const spawnNode: DependencyGraphNode = {
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
    addSpawnNodeDependencies(spawnNode, spawn, biomeById, structureById, unresolvedReferences);
    spawnNodes.push(spawnNode);
    const lootRecord = lootBySpawnId.get(spawn.id);
    if (!lootRecord) continue;
    const loot = lootRecord.loot;
    const lootNode = buildLootNode(loot, spawnNode, input.seed, rulesVersion);
    lootNodes.push(lootNode);
    loots.push(loot);
    for (const item of loot.drops) {
      const unresolvedAssetReference: UnresolvedWorldSpawnLootReference = { sourceKey: `loot-item:${spawn.id}:${item.id}`, referenceType: "asset-binding", referenceId: item.asset.assetId, reason: "procedural loot asset is awaiting a verified asset manifest binding" };
      unresolvedReferences.push(unresolvedAssetReference);
      lootItemNodes.push(buildLootItemNode(item, lootNode, input.seed, rulesVersion));
    }
  }
  const roleCounts = { regular: 0, animal: 0, npc: 0, boss: 0 } satisfies Record<GeneratedSpawnPoint["role"], number>;
  for (const spawn of sampledSpawns) roleCounts[spawn.role] += 1;
  const dropItemIds = Array.from(new Set(loots.flatMap(loot => loot.drops.map(item => item.id)))).sort();
  const unresolvedReferenceTypes = {
    "biome-context": unresolvedReferences.filter(reference => reference.referenceType === "biome-context").length,
    "structure-context": unresolvedReferences.filter(reference => reference.referenceType === "structure-context").length,
    "species-definition": unresolvedReferences.filter(reference => reference.referenceType === "species-definition").length,
    "asset-binding": unresolvedReferences.filter(reference => reference.referenceType === "asset-binding").length,
  } satisfies Record<UnresolvedWorldSpawnLootReference["referenceType"], number>;
  const graphNodes = [...biomeNodes, worldNode, ...structureNodes, ...spawnNodes, ...lootNodes, ...lootItemNodes];
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      worldHash: world.worldHash,
      worldGeneratorVersion: world.generatorVersion,
      lootGeneratorVersion: CONTENT_GENERATOR_VERSION,
      spawnCount: world.spawnPoints.length,
      sampledSpawnCount: sampledSpawns.length,
      lootCount: lootNodes.length,
      dropCount: lootItemNodes.length,
    },
    summary: {
      biomeIds,
      structureIds: world.structures.map(structure => structure.id),
      speciesIds: Array.from(new Set(world.spawnPoints.map(spawn => spawn.species))).sort(),
      dropItemIds,
      spawnCount: world.spawnPoints.length,
      sampledSpawnCount: sampledSpawns.length,
      lootSourceSpawnCount: sampledSpawns.filter(isWorldSpawnLootSource).length,
      lootCount: lootNodes.length,
      dropCount: lootItemNodes.length,
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
