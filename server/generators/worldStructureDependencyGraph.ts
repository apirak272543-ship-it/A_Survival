import { hashStableJson } from "./commonGeneratorApi";
import { createStructureGeneratorRegistry, STRUCTURE_BLUEPRINT_LIBRARY, type StructureBlueprint, type StructureGenerationInput, type StructureGenerationOutput } from "./structureGenerator";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation } from "./dependencyGraph";
import { DEFAULT_GENERATOR_MAP_ID, generateWorld, WORLD_GENERATOR_VERSION, type GeneratedWorld } from "../../tools/world-generator";

export const WORLD_STRUCTURE_GRAPH_RULES_VERSION = "world-structure-graph-rules.v1" as const;
export const WORLD_STRUCTURE_GRAPH_MAP_ID = DEFAULT_GENERATOR_MAP_ID;

export type WorldStructureDependencyGraphInput = {
  seed: string;
  radius?: number;
  blueprintIds?: string[];
  rulesVersion?: string;
};

export type WorldStructureDependencyGraphOutput = {
  artifact: {
    mapId: string;
    seed: string;
    numericSeed: number;
    worldHash: string;
    structureHash: string;
    worldGeneratorVersion: string;
    structureGeneratorVersion: string;
    blueprintCount: number;
    placementCount: number;
    rejectedCount: number;
  };
  summary: {
    worldBlocks: number;
    terrainCells: number;
    structurePlacements: number;
    rejectedPlacements: number;
    blueprintIds: string[];
    futureMapCount: 0;
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

const DEFAULT_BLUEPRINT_IDS = ["object-frontier-lantern", "compound-frontier-farm"];

function boundedRadius(value: number | undefined) {
  const radius = value ?? 32;
  if (!Number.isInteger(radius) || radius < 16 || radius > 64) throw new Error("radius must be an integer from 16 to 64");
  return radius;
}

function normalizeBlueprintIds(value: string[] | undefined) {
  const ids = value && value.length > 0 ? Array.from(new Set(value)) : DEFAULT_BLUEPRINT_IDS;
  if (ids.length > 5) throw new Error("blueprintIds must contain at most 5 unique blueprints");
  const known = new Set(STRUCTURE_BLUEPRINT_LIBRARY.map(blueprint => blueprint.id));
  const unknown = ids.filter(id => !known.has(id));
  if (unknown.length > 0) throw new Error(`Unknown structure blueprint: ${unknown[0]}`);
  return ids.sort();
}

function numericSeedFromLabel(seed: string) {
  const value = Number.parseInt(hashStableJson(seed).slice(0, 8), 16);
  return value % 2_000_000_000;
}

function structureClimate(cell: GeneratedWorld["terrain"][number]) {
  return cell.temperature > 0.7 ? "hot" as const : "temperate" as const;
}

function structureTerrain(cell: GeneratedWorld["terrain"][number]) {
  if (cell.slope < 0.12) return "flat" as const;
  if (cell.slope < 0.3) return "rolling" as const;
  if (cell.elevation > 0.7) return "mountain" as const;
  return "slope" as const;
}

function createStructureCandidates(world: GeneratedWorld) {
  const waterKeys = new Set(world.water.map(cell => `${cell.x}:${cell.z}`));
  const cells = world.terrain
    .filter(cell => cell.slope < 0.45)
    .sort((left, right) => left.x - right.x || left.z - right.z)
    .slice(0, 24);
  const radius = world.requestedRadius;
  return cells.map(cell => ({
    x: cell.x,
    y: Math.floor(cell.surfaceY),
    z: cell.z,
    context: {
      mapId: world.mapId,
      biome: "Obsidian Alien Frontier",
      terrain: structureTerrain(cell),
      climate: structureClimate(cell),
      slopeDegrees: Math.round(cell.slope * 45),
      waterDepth: waterKeys.has(`${cell.x}:${cell.z}`) ? 1 : 0,
      groundY: Math.floor(cell.surfaceY),
      freeSpaceWidth: radius * 2,
      freeSpaceLength: radius * 2,
      roadDistance: 0,
      settlementDistance: 0,
      population: 100,
      supportRatio: 1,
      accessibleEntry: true,
      worldBounds: { minX: -radius, maxX: radius, minZ: -radius, maxZ: radius },
      occupiedFootprints: [],
    },
  }));
}

function dependencyFor(target: DependencyGraphNode, required = true) {
  return { key: target.key, kind: target.kind, required, generatorId: target.generatorId, generatorVersion: target.generatorVersion, contentHash: target.contentHash };
}

function buildWorldNode(world: GeneratedWorld, seed: string, rulesVersion: string) {
  return {
    key: `world:${world.mapId}:${world.worldHash}`,
    kind: "world" as const,
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.procedural-world.v1",
    seed,
    rulesVersion,
    contentHash: world.worldHash,
    dependencies: [],
  } satisfies DependencyGraphNode;
}

function buildStructureNodes(world: GeneratedWorld, structureArtifact: { contentHash: string; generatorId: string; generatorVersion: string; seed: string; output: StructureGenerationOutput }, blueprints: StructureBlueprint[], seed: string, rulesVersion: string) {
  const worldNode = buildWorldNode(world, seed, rulesVersion);
  const blueprintNodes = blueprints.map(blueprint => ({
    key: `structure-blueprint:${blueprint.id}`,
    kind: "structure" as const,
    generatorId: structureArtifact.generatorId,
    generatorVersion: structureArtifact.generatorVersion,
    schemaVersion: "a-survival.structure-blueprint.v1",
    seed,
    rulesVersion,
    contentHash: hashStableJson(blueprint as never),
    dependencies: [],
  } satisfies DependencyGraphNode));
  const structureRun = {
    key: `structure-run:${structureArtifact.contentHash}`,
    kind: "structure" as const,
    generatorId: structureArtifact.generatorId,
    generatorVersion: structureArtifact.generatorVersion,
    schemaVersion: structureArtifact.output.schemaVersion,
    seed: structureArtifact.seed,
    rulesVersion,
    contentHash: structureArtifact.contentHash,
    dependencies: [dependencyFor(worldNode), ...blueprintNodes.map(blueprint => dependencyFor(blueprint))],
  } satisfies DependencyGraphNode;
  const blueprintById = new Map(blueprints.map(blueprint => [blueprint.id, blueprintNodes.find(node => node.key === `structure-blueprint:${blueprint.id}`)!]));
  const placementNodes = structureArtifact.output.placements.map(placement => {
    const blueprint = blueprintById.get(placement.blueprintId);
    return {
      key: `structure-placement:${placement.instanceId}`,
      kind: "structure" as const,
      generatorId: structureArtifact.generatorId,
      generatorVersion: structureArtifact.generatorVersion,
      schemaVersion: structureArtifact.output.schemaVersion,
      seed: structureArtifact.seed,
      rulesVersion,
      contentHash: hashStableJson(placement as never),
      dependencies: [dependencyFor(structureRun), ...(blueprint ? [dependencyFor(blueprint)] : [])],
    } satisfies DependencyGraphNode;
  });
  return [worldNode, ...blueprintNodes, structureRun, ...placementNodes];
}

export function buildWorldStructureDependencyGraph(input: WorldStructureDependencyGraphInput): WorldStructureDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_STRUCTURE_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_STRUCTURE_GRAPH_RULES_VERSION) throw new Error(`Unsupported world structure graph rules version: ${rulesVersion}`);
  const radius = boundedRadius(input.radius);
  const blueprintIds = normalizeBlueprintIds(input.blueprintIds);
  const numericSeed = numericSeedFromLabel(input.seed);
  const world = generateWorld({ mapId: WORLD_STRUCTURE_GRAPH_MAP_ID, seed: numericSeed, radius });
  const blueprints = STRUCTURE_BLUEPRINT_LIBRARY.filter(blueprint => blueprintIds.includes(blueprint.id));
  const structureInput: StructureGenerationInput = { mapId: WORLD_STRUCTURE_GRAPH_MAP_ID, blueprints, candidates: createStructureCandidates(world), minPlacementScore: 70, maxPlacements: blueprints.length };
  const structureRegistry = createStructureGeneratorRegistry();
  const structureArtifact = structureRegistry.generate<StructureGenerationInput, StructureGenerationOutput>("structure.placement", structureInput, { seed: input.seed, generatedAt: 0 });
  const nodes = buildStructureNodes(world, structureArtifact, blueprints, input.seed, rulesVersion);
  const structureOutput = structureArtifact.output;
  return {
    artifact: {
      mapId: world.mapId,
      seed: input.seed,
      numericSeed,
      worldHash: world.worldHash,
      structureHash: structureArtifact.contentHash,
      worldGeneratorVersion: world.generatorVersion,
      structureGeneratorVersion: structureArtifact.generatorVersion,
      blueprintCount: blueprints.length,
      placementCount: structureOutput.placements.length,
      rejectedCount: structureOutput.rejected.length,
    },
    summary: { worldBlocks: world.blocks.length, terrainCells: world.terrain.length, structurePlacements: structureOutput.placements.length, rejectedPlacements: structureOutput.rejected.length, blueprintIds, futureMapCount: 0 },
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}
