import { DEFAULT_OBSIDIAN_GENERATOR_CONFIG, DEFAULT_GENERATOR_MAP_ID, generateWorld, type GeneratedWorld, type WorldGeneratorConfig } from "../tools/world-generator";
import { validateGeneratedWorld } from "../tools/worldSpatialConstraints";

export const WORLD_GENERATOR_OUTPUT_CONTRACT_VERSION = "world-generator-output.v1" as const;
export const MAX_GENERATOR_RADIUS = 64;

export type WorldGeneratorOutputResult = {
  contractVersion: typeof WORLD_GENERATOR_OUTPUT_CONTRACT_VERSION;
  valid: boolean;
  deterministic: boolean;
  issues: string[];
  world: GeneratedWorld;
  summary: {
    blockCount: number;
    terrainCellCount: number;
    waterCellCount: number;
    caveCount: number;
    resourceCount: number;
    structureCount: number;
    spawnPointCount: number;
    structureKinds: string[];
    spawnRoles: string[];
  };
  runtimePolicy: {
    backendOnly: true;
    playerFacingWorldGenerationUi: false;
    renderLoopGenerationAllowed: false;
    futureMapPlayable: false;
    persistenceWritePerformed: false;
  };
};

const REQUIRED_STRUCTURE_KINDS = ["safe-zone", "shop", "npc-camp", "ruin", "boss-room"] as const;
const REQUIRED_SPAWN_ROLES = ["regular", "animal", "npc", "boss"] as const;

function uniqueSorted(values: readonly string[]) {
  return Array.from(new Set(values)).sort();
}

function hasRequiredValues(values: readonly string[], required: readonly string[]) {
  return required.every(value => values.includes(value));
}

function sameGeneratedWorld(first: GeneratedWorld, second: GeneratedWorld) {
  return first.worldHash === second.worldHash && JSON.stringify(first) === JSON.stringify(second);
}

function configWithDefaults(config: Partial<WorldGeneratorConfig> | undefined): WorldGeneratorConfig {
  return {
    ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG,
    ...config,
    terrain: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.terrain, ...(config?.terrain ?? {}) },
    water: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.water, ...(config?.water ?? {}) },
    vegetation: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation, ...(config?.vegetation ?? {}) },
    resources: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.resources, ...(config?.resources ?? {}) },
    caves: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.caves, ...(config?.caves ?? {}) },
    spawns: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns, ...(config?.spawns ?? {}) },
    structures: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.structures, ...(config?.structures ?? {}) },
  };
}

export function evaluateWorldGeneratorOutput(configOverride?: Partial<WorldGeneratorConfig>): WorldGeneratorOutputResult {
  const config = configWithDefaults(configOverride);
  if (config.mapId !== DEFAULT_GENERATOR_MAP_ID) throw new Error(`world generator output only accepts ${DEFAULT_GENERATOR_MAP_ID}`);
  if (!Number.isInteger(config.radius) || config.radius < 1 || config.radius > MAX_GENERATOR_RADIUS) throw new Error(`generator radius must be an integer from 1 to ${MAX_GENERATOR_RADIUS}`);
  const first = generateWorld(config);
  const second = generateWorld(config);
  const report = validateGeneratedWorld(first, config);
  const structureKinds = uniqueSorted(first.structures.map(structure => structure.kind));
  const spawnRoles = uniqueSorted(first.spawnPoints.map(point => point.role));
  const issues = [...report.issues.map(issue => issue.code)];
  if (!sameGeneratedWorld(first, second)) issues.push("GENERATOR_OUTPUT_NOT_DETERMINISTIC");
  if (first.metadata.blockFirst !== true || first.metadata.deterministic !== true || first.metadata.hybridGeneration !== true) issues.push("GENERATOR_METADATA_CONTRACT_INVALID");
  if (first.metadata.playerFacingWorldGenerationUi !== false) issues.push("GENERATOR_PLAYER_UI_MUST_BE_DISABLED");
  if (!hasRequiredValues(structureKinds, REQUIRED_STRUCTURE_KINDS)) issues.push("GENERATOR_STRUCTURE_COVERAGE_INCOMPLETE");
  if (!hasRequiredValues(spawnRoles, REQUIRED_SPAWN_ROLES)) issues.push("GENERATOR_SPAWN_COVERAGE_INCOMPLETE");
  if (first.blocks.length === 0 || first.terrain.length === 0) issues.push("GENERATOR_TERRAIN_OR_BLOCK_OUTPUT_EMPTY");
  return {
    contractVersion: WORLD_GENERATOR_OUTPUT_CONTRACT_VERSION,
    valid: issues.length === 0,
    deterministic: !issues.includes("GENERATOR_OUTPUT_NOT_DETERMINISTIC"),
    issues: uniqueSorted(issues),
    world: first,
    summary: {
      blockCount: first.blocks.length,
      terrainCellCount: first.terrain.length,
      waterCellCount: first.water.length,
      caveCount: first.caves.length,
      resourceCount: first.resources.length,
      structureCount: first.structures.length,
      spawnPointCount: first.spawnPoints.length,
      structureKinds,
      spawnRoles,
    },
    runtimePolicy: {
      backendOnly: true,
      playerFacingWorldGenerationUi: false,
      renderLoopGenerationAllowed: false,
      futureMapPlayable: false,
      persistenceWritePerformed: false,
    },
  };
}
