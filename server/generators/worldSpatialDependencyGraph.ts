import { hashStableJson } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";
import { DEFAULT_GENERATOR_MAP_ID, DEFAULT_OBSIDIAN_GENERATOR_CONFIG, generateWorld, WORLD_GENERATOR_VERSION, type GeneratedWorld, type WorldGeneratorConfig } from "../../tools/world-generator";
import { canPlaceWorldObject, getSurfaceInfo, OBSIDIAN_OBJECT_RULES, OBSIDIAN_SPATIAL_RULES_VERSION, repairGeneratedWorld, validateGeneratedWorld } from "../../tools/worldSpatialConstraints";

export const WORLD_SPATIAL_GRAPH_RULES_VERSION = "world-spatial-graph-rules.v1" as const;
export const WORLD_SPATIAL_GRAPH_SCHEMA_VERSION = "a-survival.world-spatial-graph.v1" as const;
export const WORLD_SPATIAL_GRAPH_VERSION = "1.0.0" as const;
export const MAX_WORLD_SPATIAL_RADIUS = 64;
export const MAX_WORLD_SPATIAL_PLACEMENT_SAMPLES = 12;

type SpatialSubject = keyof typeof OBSIDIAN_OBJECT_RULES;

export type WorldSpatialDependencyGraphInput = {
  seed?: number;
  radius?: number;
  placementSubjects?: SpatialSubject[];
  rulesVersion?: string;
};

export type WorldSpatialPlacementAssessment = {
  subject: SpatialSubject;
  accepted: boolean;
  reason?: string;
  surface?: {
    x: number;
    z: number;
    surfaceY: number;
    biome: string;
    slope: number;
    waterDepth: number;
  };
};

export type WorldSpatialDependencyGraphOutput = {
  artifact: {
    mapId: typeof DEFAULT_GENERATOR_MAP_ID;
    seed: number;
    radius: number;
    generatorVersion: string;
    spatialRulesVersion: string;
    contentHash: string;
  };
  validation: {
    valid: boolean;
    rulesVersion: string;
    issueCount: number;
    errorCount: number;
    repairableCount: number;
    issueCodes: string[];
    repairedCount: number;
  };
  placementAssessments: WorldSpatialPlacementAssessment[];
  summary: {
    mapId: typeof DEFAULT_GENERATOR_MAP_ID;
    blockCount: number;
    terrainCellCount: number;
    waterCellCount: number;
    caveCount: number;
    resourceCount: number;
    structureCount: number;
    spawnPointCount: number;
    validGeneratedWorld: boolean;
    placementSampleCount: number;
    acceptedPlacementSampleCount: number;
    rejectedPlacementSampleCount: number;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedSeed(value: number | undefined): number {
  const seed = value ?? DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed;
  if (!Number.isInteger(seed) || seed < -2_147_483_648 || seed > 2_147_483_647) throw new Error("seed must be a signed 32-bit integer");
  return seed;
}

function boundedRadius(value: number | undefined): number {
  const radius = Math.trunc(value ?? 20);
  if (!Number.isFinite(radius) || radius < 8 || radius > MAX_WORLD_SPATIAL_RADIUS) throw new Error(`radius must be between 8 and ${MAX_WORLD_SPATIAL_RADIUS}`);
  return radius;
}

function boundedSubjects(value: SpatialSubject[] | undefined): SpatialSubject[] {
  const subjects = value ?? ["terrain", "water", "tree", "sapling", "grass", "cactus", "rock", "ore", "structure", "npc", "animal", "monster"];
  if (subjects.length < 1 || subjects.length > MAX_WORLD_SPATIAL_PLACEMENT_SAMPLES) throw new Error(`placementSubjects must contain between 1 and ${MAX_WORLD_SPATIAL_PLACEMENT_SAMPLES} subjects`);
  const unique = Array.from(new Set(subjects));
  if (unique.length !== subjects.length) throw new Error("placementSubjects must be unique");
  return unique;
}

function worldConfig(seed: number, radius: number): WorldGeneratorConfig {
  return { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, seed, radius, mapId: DEFAULT_GENERATOR_MAP_ID, handAuthoredLandmarks: [] };
}

function worldNode(world: GeneratedWorld, config: WorldGeneratorConfig, rulesVersion: string): DependencyGraphNode {
  return {
    key: `world:${world.mapId}:${world.seed}:${config.radius}`,
    kind: "world",
    generatorId: "world.generator",
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: "a-survival.world-generator.v1",
    seed: String(world.seed),
    rulesVersion,
    contentHash: hashStableJson({ mapId: world.mapId, seed: world.seed, radius: config.radius, worldHash: world.worldHash, spatialRulesVersion: world.metadata.spatialRulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return { key: node.key, kind: node.kind, required: true, generatorId: node.generatorId, generatorVersion: node.generatorVersion, contentHash: node.contentHash };
}

function spatialNode(world: GeneratedWorld, config: WorldGeneratorConfig, rulesVersion: string, worldNodeValue: DependencyGraphNode, validation: ReturnType<typeof validateGeneratedWorld>): DependencyGraphNode {
  return {
    key: `world-spatial:${world.mapId}:${world.seed}:${config.radius}`,
    kind: "simulation",
    generatorId: "world.spatial",
    generatorVersion: WORLD_SPATIAL_GRAPH_VERSION,
    schemaVersion: WORLD_SPATIAL_GRAPH_SCHEMA_VERSION,
    seed: String(world.seed),
    rulesVersion,
    contentHash: hashStableJson({ mapId: world.mapId, seed: world.seed, radius: config.radius, spatialRulesVersion: validation.rulesVersion, valid: validation.valid, issueCodes: validation.issues.map(issue => issue.code) } as never),
    dependencies: [dependencyFor(worldNodeValue)],
  };
}

function placementAssessment(world: GeneratedWorld, config: WorldGeneratorConfig, subject: SpatialSubject): WorldSpatialPlacementAssessment {
  const surface = getSurfaceInfo(world, 0, 0);
  const result = canPlaceWorldObject(world, config, { id: `sample-${subject}`, x: 0, y: surface ? Math.floor(surface.surfaceY) + 1 : undefined, z: 0, subject });
  return {
    subject,
    accepted: result.accepted,
    ...(result.accepted ? {} : { reason: result.reason }),
    ...(result.surface ? { surface: { x: result.surface.x, z: result.surface.z, surfaceY: result.surface.surfaceY, biome: result.surface.biome, slope: result.surface.slope, waterDepth: result.surface.waterDepth } } : {}),
  };
}

export function buildWorldSpatialDependencyGraph(input: WorldSpatialDependencyGraphInput = {}): WorldSpatialDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_SPATIAL_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_SPATIAL_GRAPH_RULES_VERSION) throw new Error(`Unsupported world spatial graph rules version: ${rulesVersion}`);
  const seed = boundedSeed(input.seed);
  const radius = boundedRadius(input.radius);
  const placementSubjects = boundedSubjects(input.placementSubjects);
  const config = worldConfig(seed, radius);
  const world = generateWorld(config);
  const validation = validateGeneratedWorld(world, config);
  const repaired = repairGeneratedWorld(world, config);
  const worldNodeValue = worldNode(world, config, rulesVersion);
  const spatialNodeValue = spatialNode(world, config, rulesVersion, worldNodeValue, validation);
  const nodes = [worldNodeValue, spatialNodeValue];
  const placementAssessments = placementSubjects.map(subject => placementAssessment(world, config, subject));
  const issueCodes = Array.from(new Set(validation.issues.map(issue => issue.code))).sort();
  const errorCount = validation.issues.filter(issue => issue.severity === "error").length;
  const repairableCount = validation.issues.filter(issue => issue.severity === "repairable").length;
  return {
    artifact: {
      mapId: DEFAULT_GENERATOR_MAP_ID,
      seed,
      radius,
      generatorVersion: WORLD_GENERATOR_VERSION,
      spatialRulesVersion: OBSIDIAN_SPATIAL_RULES_VERSION,
      contentHash: hashStableJson({ mapId: DEFAULT_GENERATOR_MAP_ID, seed, radius, worldHash: world.worldHash, validation, placementAssessments } as never),
    },
    validation: {
      valid: validation.valid,
      rulesVersion: validation.rulesVersion,
      issueCount: validation.issues.length,
      errorCount,
      repairableCount,
      issueCodes,
      repairedCount: repaired.report.repairedCount,
    },
    placementAssessments,
    summary: {
      mapId: DEFAULT_GENERATOR_MAP_ID,
      blockCount: world.blocks.length,
      terrainCellCount: world.terrain.length,
      waterCellCount: world.water.length,
      caveCount: world.caves.length,
      resourceCount: world.resources.length,
      structureCount: world.structures.length,
      spawnPointCount: world.spawnPoints.length,
      validGeneratedWorld: validation.valid,
      placementSampleCount: placementAssessments.length,
      acceptedPlacementSampleCount: placementAssessments.filter(sample => sample.accepted).length,
      rejectedPlacementSampleCount: placementAssessments.filter(sample => !sample.accepted).length,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    },
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function getDefaultWorldSpatialDependencyGraphInput(seed = DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed): WorldSpatialDependencyGraphInput {
  return { seed, radius: 20, placementSubjects: ["terrain", "water", "tree", "structure", "npc", "animal", "monster"] };
}
