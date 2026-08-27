import { getBlockDefinition } from "../../client/src/game/data/blockModules";
import {
  DEFAULT_GENERATOR_MAP_ID,
  DEFAULT_OBSIDIAN_GENERATOR_CONFIG,
  WORLD_GENERATOR_VERSION,
  generateWorld,
  type GeneratedWorld,
  type WorldGeneratorConfig,
} from "../../tools/world-generator";
import { validateGeneratedWorld } from "../../tools/worldSpatialConstraints";
import { hashStableJson } from "./commonGeneratorApi";
import {
  validateGeneratorDependencyGraph,
  type DependencyGraphNode,
  type DependencyGraphValidation,
  type GeneratorDependency,
} from "./dependencyGraph";

export const WORLD_GENERATOR_COVERAGE_GRAPH_RULES_VERSION = "world-generator-coverage-graph-rules.v1" as const;
export const WORLD_GENERATOR_COVERAGE_GRAPH_SCHEMA_VERSION = "a-survival.world-generator-coverage-graph.v1" as const;
export const WORLD_GENERATOR_COVERAGE_GRAPH_VERSION = "1.0.0" as const;
export const WORLD_GENERATOR_COVERAGE_MIN_RADIUS = 8;
export const WORLD_GENERATOR_COVERAGE_MAX_RADIUS = DEFAULT_OBSIDIAN_GENERATOR_CONFIG.radius;

const GENERATOR_OWNER_KEY = "owner:world:deterministic-generator" as const;
const SPATIAL_OWNER_KEY = "owner:world:spatial-validation" as const;
const EXPORT_OWNER_KEY = "owner:world:module-export" as const;
const REQUIRED_STRUCTURE_KINDS = ["safe-zone", "shop", "npc-camp", "ruin", "boss-room"] as const;
const REQUIRED_SPAWN_ROLES = ["regular", "animal", "npc", "boss"] as const;

export type WorldGeneratorCoverageDependencyGraphInput = {
  mapId?: string;
  seed?: number;
  radius?: number;
  difficulty?: WorldGeneratorConfig["difficulty"];
  rulesVersion?: string;
};

export type WorldGeneratorCoverageSummary = {
  mapId: string;
  seed: number;
  radius: number;
  generatorVersion: string;
  deterministic: true;
  backendOnly: true;
  playerFacingWorldGenerationUi: false;
  worldHash: string;
  repeatWorldHash: string;
  repeatHashMatches: boolean;
  validation: {
    valid: boolean;
    issueCount: number;
    errorCount: number;
    repairableCount: number;
  };
  outputCounts: {
    blockCount: number;
    terrainCellCount: number;
    waterCellCount: number;
    treeBlockCount: number;
    vegetationBlockCount: number;
    resourceCount: number;
    caveCount: number;
    structureCount: number;
    spawnPointCount: number;
  };
  requiredCoverage: {
    terrain: boolean;
    water: boolean;
    tree: boolean;
    vegetation: boolean;
    resources: boolean;
    caves: boolean;
    safeZone: boolean;
    shop: boolean;
    npcCamp: boolean;
    bossRoom: boolean;
    regularSpawn: boolean;
    animalSpawn: boolean;
    npcSpawn: boolean;
    bossSpawn: boolean;
  };
  structureKinds: string[];
  spawnRoles: string[];
  exportPreview: {
    manifestFields: string[];
    moduleFiles: string[];
    contentHash: string;
    writesPerformed: false;
  };
  owners: {
    deterministicGenerator: true;
    spatialValidation: true;
    moduleExport: true;
    playerGeneratorUi: false;
    runtimeMapSelection: false;
    futureMapEnablement: false;
  };
  runtimeImportAllowed: false;
  playerVisible: false;
  cacheable: false;
};

export type WorldGeneratorCoverageDependencyGraphOutput = {
  artifact: {
    generatorId: "world.generator.coverage.audit";
    generatorVersion: typeof WORLD_GENERATOR_COVERAGE_GRAPH_VERSION;
    mapId: string;
    seed: number;
    radius: number;
    contentHash: string;
  };
  world: Pick<GeneratedWorld, "mapId" | "seed" | "worldHash" | "metadata">;
  summary: WorldGeneratorCoverageSummary;
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

function boundedSeed(value: number | undefined): number {
  const seed = value ?? DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed;
  if (!Number.isInteger(seed) || seed < -2_147_483_648 || seed > 2_147_483_647) throw new Error("seed must be a signed 32-bit integer");
  return seed;
}

function boundedRadius(value: number | undefined): number {
  const radius = value ?? DEFAULT_OBSIDIAN_GENERATOR_CONFIG.radius;
  if (!Number.isInteger(radius) || radius < WORLD_GENERATOR_COVERAGE_MIN_RADIUS || radius > WORLD_GENERATOR_COVERAGE_MAX_RADIUS) {
    throw new Error(`radius must be an integer between ${WORLD_GENERATOR_COVERAGE_MIN_RADIUS} and ${WORLD_GENERATOR_COVERAGE_MAX_RADIUS}`);
  }
  return radius;
}

function sourceNode(key: string, generatorId: string, kind: DependencyGraphNode["kind"], source: string, rulesVersion: string): DependencyGraphNode {
  return {
    key,
    kind,
    generatorId,
    generatorVersion: WORLD_GENERATOR_VERSION,
    schemaVersion: WORLD_GENERATOR_COVERAGE_GRAPH_SCHEMA_VERSION,
    seed: DEFAULT_GENERATOR_MAP_ID,
    rulesVersion,
    contentHash: hashStableJson({ generatorId, source, rulesVersion } as never),
    dependencies: [],
  };
}

function dependencyFor(node: DependencyGraphNode): GeneratorDependency {
  return {
    key: node.key,
    kind: node.kind,
    required: true,
    generatorId: node.generatorId,
    generatorVersion: node.generatorVersion,
    contentHash: node.contentHash,
  };
}

function countWorldBlocks(world: GeneratedWorld) {
  let treeBlockCount = 0;
  let vegetationBlockCount = 0;
  for (const block of world.blocks) {
    const kind = getBlockDefinition(block.blockId)?.kind;
    if (kind === "log" || kind === "leaf") treeBlockCount += 1;
    if (kind === "log" || kind === "leaf" || kind === "plant") vegetationBlockCount += 1;
  }
  return { treeBlockCount, vegetationBlockCount };
}

function structureKinds(world: GeneratedWorld): string[] {
  return Array.from(new Set(world.structures.map(structure => structure.kind))).sort();
}

function spawnRoles(world: GeneratedWorld): string[] {
  return Array.from(new Set(world.spawnPoints.map(spawn => spawn.role))).sort();
}

function buildExportPreview(world: GeneratedWorld) {
  const manifestFields = ["mapId", "profileId", "generatorVersion", "seed", "radius", "chunkSize", "worldHash", "blockFirst"];
  const moduleFiles = ["manifest.json", "terrain.json", "blocks.json", "biomes.json", "water.json", "resources.json", "caves.json", "structures.json", "spawns.json", "metadata.json"];
  const payload = {
    manifest: Object.fromEntries(manifestFields.map(field => [field, field === "mapId" ? world.mapId : field === "generatorVersion" ? world.generatorVersion : field === "seed" ? world.seed : field === "radius" ? world.requestedRadius : field === "chunkSize" ? world.chunkSize : field === "worldHash" ? world.worldHash : field === "profileId" ? world.profileId : field === "blockFirst" ? world.metadata.blockFirst : null])),
    counts: { blocks: world.blocks.length, terrain: world.terrain.length, water: world.water.length, resources: world.resources.length, caves: world.caves.length, structures: world.structures.length, spawns: world.spawnPoints.length },
    moduleFiles,
  };
  return { manifestFields, moduleFiles, contentHash: hashStableJson(payload as never), writesPerformed: false as const };
}

export function buildWorldGeneratorCoverageDependencyGraph(
  input: WorldGeneratorCoverageDependencyGraphInput = {},
): WorldGeneratorCoverageDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? WORLD_GENERATOR_COVERAGE_GRAPH_RULES_VERSION;
  if (rulesVersion !== WORLD_GENERATOR_COVERAGE_GRAPH_RULES_VERSION) throw new Error(`Unsupported world generator coverage graph rules version: ${rulesVersion}`);
  const mapId = input.mapId ?? DEFAULT_GENERATOR_MAP_ID;
  if (mapId !== DEFAULT_GENERATOR_MAP_ID) throw new Error(`Only ${DEFAULT_GENERATOR_MAP_ID} is enabled until the vertical slice is complete.`);
  const seed = boundedSeed(input.seed);
  const radius = boundedRadius(input.radius);
  const config: Partial<WorldGeneratorConfig> = { mapId, seed, radius, ...(input.difficulty ? { difficulty: input.difficulty } : {}) };
  const world = generateWorld(config);
  const repeatWorld = generateWorld(config);
  const validation = validateGeneratedWorld(world, { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, ...config });
  const blockCounts = countWorldBlocks(world);
  const structures = structureKinds(world);
  const spawns = spawnRoles(world);
  const exportPreview = buildExportPreview(world);
  const summary: WorldGeneratorCoverageSummary = {
    mapId: world.mapId,
    seed: world.seed,
    radius: world.requestedRadius,
    generatorVersion: world.generatorVersion,
    deterministic: world.metadata.deterministic,
    backendOnly: !world.metadata.playerFacingWorldGenerationUi,
    playerFacingWorldGenerationUi: world.metadata.playerFacingWorldGenerationUi,
    worldHash: world.worldHash,
    repeatWorldHash: repeatWorld.worldHash,
    repeatHashMatches: world.worldHash === repeatWorld.worldHash,
    validation: {
      valid: validation.valid,
      issueCount: validation.issues.length,
      errorCount: validation.issues.filter(issue => issue.severity === "error").length,
      repairableCount: validation.issues.filter(issue => issue.severity === "repairable").length,
    },
    outputCounts: {
      blockCount: world.blocks.length,
      terrainCellCount: world.terrain.length,
      waterCellCount: world.water.length,
      ...blockCounts,
      resourceCount: world.resources.length,
      caveCount: world.caves.length,
      structureCount: world.structures.length,
      spawnPointCount: world.spawnPoints.length,
    },
    requiredCoverage: {
      terrain: world.terrain.length > 0,
      water: world.water.length > 0,
      tree: blockCounts.treeBlockCount > 0,
      vegetation: blockCounts.vegetationBlockCount > 0,
      resources: world.resources.length > 0,
      caves: world.caves.length > 0,
      safeZone: world.structures.some(structure => structure.kind === "safe-zone"),
      shop: world.structures.some(structure => structure.kind === "shop"),
      npcCamp: world.structures.some(structure => structure.kind === "npc-camp"),
      bossRoom: world.structures.some(structure => structure.kind === "boss-room"),
      regularSpawn: world.spawnPoints.some(spawn => spawn.role === "regular"),
      animalSpawn: world.spawnPoints.some(spawn => spawn.role === "animal"),
      npcSpawn: world.spawnPoints.some(spawn => spawn.role === "npc"),
      bossSpawn: world.spawnPoints.some(spawn => spawn.role === "boss"),
    },
    structureKinds: structures,
    spawnRoles: spawns,
    exportPreview,
    owners: {
      deterministicGenerator: true,
      spatialValidation: true,
      moduleExport: true,
      playerGeneratorUi: false,
      runtimeMapSelection: false,
      futureMapEnablement: false,
    },
    runtimeImportAllowed: false,
    playerVisible: false,
    cacheable: false,
  };
  const generatorNode = sourceNode(GENERATOR_OWNER_KEY, "world.generator", "world", "tools/world-generator.ts", rulesVersion);
  const spatialNode = sourceNode(SPATIAL_OWNER_KEY, "world.spatial.constraints", "simulation", "tools/worldSpatialConstraints.ts", rulesVersion);
  const exportNode = sourceNode(EXPORT_OWNER_KEY, "world.module.export", "world", "tools/world-generator.ts:writeWorldExport", rulesVersion);
  const dependencies = [generatorNode, spatialNode, exportNode].map(dependencyFor);
  const auditNode: DependencyGraphNode = {
    key: `world-generator-coverage:${world.mapId}:${world.seed}:${world.requestedRadius}`,
    kind: "world",
    generatorId: "world.generator.coverage.audit",
    generatorVersion: WORLD_GENERATOR_COVERAGE_GRAPH_VERSION,
    schemaVersion: WORLD_GENERATOR_COVERAGE_GRAPH_SCHEMA_VERSION,
    seed: String(world.seed),
    rulesVersion,
    contentHash: hashStableJson({ summary, dependencies } as never),
    dependencies,
  };
  const nodes = [generatorNode, spatialNode, exportNode, auditNode];
  return {
    artifact: {
      generatorId: "world.generator.coverage.audit",
      generatorVersion: WORLD_GENERATOR_COVERAGE_GRAPH_VERSION,
      mapId: world.mapId,
      seed: world.seed,
      radius: world.requestedRadius,
      contentHash: auditNode.contentHash,
    },
    world: { mapId: world.mapId, seed: world.seed, worldHash: world.worldHash, metadata: world.metadata },
    summary,
    nodes,
    graph: validateGeneratorDependencyGraph(nodes),
  };
}

export function getDefaultWorldGeneratorCoverageDependencyGraphInput(): WorldGeneratorCoverageDependencyGraphInput {
  return { mapId: DEFAULT_GENERATOR_MAP_ID, seed: DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed, radius: DEFAULT_OBSIDIAN_GENERATOR_CONFIG.radius, difficulty: DEFAULT_OBSIDIAN_GENERATOR_CONFIG.difficulty };
}
