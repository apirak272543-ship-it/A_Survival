import { blockKey, getBlockDefinition, type WorldBlock } from "../client/src/game/data/blockModules";
import type { GeneratedCave, GeneratedResourceNode, GeneratedSpawnPoint, GeneratedTerrainCell, GeneratedWaterCell, GeneratedWorld, GeneratedWorldStructure, WorldGeneratorConfig } from "./world-generator";

export const OBSIDIAN_SPATIAL_RULES_VERSION = "obsidian-spatial-v1";

export type SpatialIssue = {
  code: string;
  message: string;
  subjectId?: string;
  severity: "error" | "repairable";
};

export type SpatialValidationReport = {
  valid: boolean;
  issues: SpatialIssue[];
  repairedCount: number;
  rulesVersion: string;
};

export type SurfaceInfo = {
  x: number;
  z: number;
  surfaceY: number;
  surfaceBlockId: string;
  biome: string;
  slope: number;
  waterDepth: number;
  temperature: number;
  moisture: number;
};

export type PlacementRequest = {
  id: string;
  x: number;
  y?: number;
  z: number;
  radius?: number;
  height?: number;
  subject: SpatialSubject;
  maxSlope?: number;
  maxWaterDepth?: number;
  minSurfaceY?: number;
  maxSurfaceY?: number;
  allowedBiomes?: string[];
  forbiddenBlockIds?: string[];
  protected?: boolean;
};

export type PlacementResult =
  | { accepted: true; surface: SurfaceInfo }
  | { accepted: false; reason: string; surface?: SurfaceInfo };

export const OBSIDIAN_HEIGHT_LAYERS = {
  abyss: { minY: -16, maxY: -1, purpose: "reserved underground void" },
  underground: { minY: 0, maxY: -1, purpose: "reserved cave volume below surface" },
  surface: { minY: 0, maxY: 4, purpose: "playable ash/obsidian terrain relief" },
  lowHills: { minY: 1, maxY: 2, purpose: "walkable foothills and shallow paths" },
  highHills: { minY: 2, maxY: 3, purpose: "readable stepped elevation" },
  crags: { minY: 3, maxY: 4, purpose: "upper crag accents, not default spawn space" },
  canopy: { minY: 5, maxY: 12, purpose: "bounded tree/large plant volume above surface" },
  structure: { minY: 1, maxY: 12, purpose: "bounded landmark and building volume" },
} as const;

export const OBSIDIAN_OBJECT_RULES = {
  terrain: { minHeight: 1, maxHeight: 1, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 1, maxWaterDepth: 0, groundContact: false },
  water: { minHeight: 0, maxHeight: 1, minSurfaceY: 0, maxSurfaceY: 2, maxSlope: 0.5, maxWaterDepth: 1, groundContact: true },
  tree: { minHeight: 3, maxHeight: 8, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.45, maxWaterDepth: 0, groundContact: true },
  sapling: { minHeight: 1, maxHeight: 1, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.5, maxWaterDepth: 0, groundContact: true },
  grass: { minHeight: 1, maxHeight: 1, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.7, maxWaterDepth: 0, groundContact: true },
  cactus: { minHeight: 1, maxHeight: 3, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.35, maxWaterDepth: 0, groundContact: true },
  rock: { minHeight: 1, maxHeight: 4, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.7, maxWaterDepth: 0, groundContact: true },
  ore: { minHeight: 1, maxHeight: 1, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.8, maxWaterDepth: 0, groundContact: true },
  structure: { minHeight: 1, maxHeight: 12, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.5, maxWaterDepth: 0, groundContact: true },
  npc: { minHeight: 1, maxHeight: 2, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.5, maxWaterDepth: 0, groundContact: true },
  animal: { minHeight: 1, maxHeight: 2, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.35, maxWaterDepth: 1, groundContact: true },
  monster: { minHeight: 1, maxHeight: 2, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.6, maxWaterDepth: 0, groundContact: true },
  boss: { minHeight: 2, maxHeight: 4, minSurfaceY: 0, maxSurfaceY: 4, maxSlope: 0.45, maxWaterDepth: 0, groundContact: true },
} as const;

type SpatialSubject = keyof typeof OBSIDIAN_OBJECT_RULES;

function coordKey(x: number, z: number) {
  return `${Math.floor(x)}:${Math.floor(z)}`;
}

function nearestCell(cells: GeneratedTerrainCell[], x: number, z: number) {
  return cells.reduce<GeneratedTerrainCell | undefined>((nearest, cell) => {
    if (!nearest) return cell;
    return Math.hypot(cell.x - x, cell.z - z) < Math.hypot(nearest.x - x, nearest.z - z) ? cell : nearest;
  }, undefined);
}

export function getSurfaceInfo(world: GeneratedWorld, x: number, z: number): SurfaceInfo | undefined {
  const cell = world.terrain.find(candidate => candidate.x === Math.floor(x) && candidate.z === Math.floor(z)) ?? nearestCell(world.terrain, x, z);
  if (!cell) return undefined;
  const waterDepth = world.water.some(water => water.x === cell.x && water.z === cell.z) ? 1 : 0;
  return { x: cell.x, z: cell.z, surfaceY: cell.surfaceY, surfaceBlockId: cell.topBlockId, biome: cell.biome, slope: cell.slope, waterDepth, temperature: cell.temperature, moisture: cell.moisture };
}

export function canPlaceWorldObject(world: GeneratedWorld, config: WorldGeneratorConfig, request: PlacementRequest): PlacementResult {
  const bounds = worldBounds(config);
  const radius = Math.max(0, request.radius ?? 0);
  const surface = getSurfaceInfo(world, request.x, request.z);
  if (request.x - radius < bounds.minX || request.x + radius > bounds.maxX || request.z - radius < bounds.minZ || request.z + radius > bounds.maxZ) return { accepted: false, reason: "outside world bounds", surface };
  if (!surface) return { accepted: false, reason: "no generated surface", surface };
  const rule = OBSIDIAN_OBJECT_RULES[request.subject];
  const maxSlope = request.maxSlope ?? rule.maxSlope;
  const maxWaterDepth = request.maxWaterDepth ?? rule.maxWaterDepth;
  if (surface.slope > maxSlope) return { accepted: false, reason: `slope ${surface.slope} exceeds ${maxSlope}`, surface };
  if (surface.waterDepth > maxWaterDepth) return { accepted: false, reason: `water depth ${surface.waterDepth} exceeds ${maxWaterDepth}`, surface };
  if (request.minSurfaceY !== undefined && surface.surfaceY < request.minSurfaceY) return { accepted: false, reason: `surface Y ${surface.surfaceY} is below ${request.minSurfaceY}`, surface };
  if (request.maxSurfaceY !== undefined && surface.surfaceY > request.maxSurfaceY) return { accepted: false, reason: `surface Y ${surface.surfaceY} is above ${request.maxSurfaceY}`, surface };
  if (request.allowedBiomes && !request.allowedBiomes.includes(surface.biome)) return { accepted: false, reason: `biome ${surface.biome} is not allowed`, surface };
  if (request.y !== undefined && (request.y < bounds.minY || request.y + (request.height ?? rule.minHeight) > bounds.maxY)) return { accepted: false, reason: `vertical range ${request.y}..${request.y + (request.height ?? rule.minHeight)} is outside bounds`, surface };
  if (request.forbiddenBlockIds?.includes(surface.surfaceBlockId)) return { accepted: false, reason: `surface block ${surface.surfaceBlockId} is forbidden`, surface };
  return { accepted: true, surface };
}

function subjectForBlock(block: WorldBlock): SpatialSubject {
  const definition = getBlockDefinition(block.blockId);
  if (definition?.kind === "liquid") return "water";
  if (definition?.kind === "log" || definition?.kind === "leaf" || block.groupId?.startsWith("tree:")) return block.state === "sapling" ? "sapling" : "tree";
  if (block.groupId?.startsWith("cactus:")) return "cactus";
  if (definition?.kind === "plant") return definition.stage === "sapling" ? "sapling" : "grass";
  if (definition?.kind === "rock") return "rock";
  if (definition?.kind === "ore") return "ore";
  if (definition?.kind === "obstacle") return "structure";
  return "terrain";
}

function push(issues: SpatialIssue[], code: string, message: string, subjectId?: string, severity: SpatialIssue["severity"] = "repairable") {
  issues.push({ code, message, subjectId, severity });
}

function worldBounds(config: WorldGeneratorConfig) {
  return { minX: -config.radius, maxX: config.radius, minY: OBSIDIAN_HEIGHT_LAYERS.abyss.minY, maxY: OBSIDIAN_HEIGHT_LAYERS.structure.maxY, minZ: -config.radius, maxZ: config.radius };
}

function validateBlockBounds(block: WorldBlock, config: WorldGeneratorConfig, issues: SpatialIssue[]) {
  const bounds = worldBounds(config);
  if (block.x < bounds.minX || block.x > bounds.maxX || block.y < bounds.minY || block.y > bounds.maxY || block.z < bounds.minZ || block.z > bounds.maxZ) {
    push(issues, "BLOCK_OUT_OF_WORLD_BOUNDS", `Block ${block.key} is outside X/Z ±${config.radius} or Y ${bounds.minY}..${bounds.maxY}.`, block.key, "error");
  }
  if (!getBlockDefinition(block.blockId)) push(issues, "UNKNOWN_BLOCK_DEFINITION", `Block ${block.key} references unknown definition ${block.blockId}.`, block.key, "error");
}

function validateTerrainAndGroundContact(world: GeneratedWorld, config: WorldGeneratorConfig, issues: SpatialIssue[]) {
  const surfaceByCoord = new Map(world.terrain.map(cell => [coordKey(cell.x, cell.z), cell]));
  for (const cell of world.terrain) {
    if (cell.x < -config.radius || cell.x > config.radius || cell.z < -config.radius || cell.z > config.radius) push(issues, "TERRAIN_OUT_OF_BOUNDS", `Terrain cell ${cell.x}:${cell.z} is outside world radius.`, `${cell.x}:${cell.z}`, "error");
    if (cell.surfaceY < 0 || cell.surfaceY > config.terrain.maxHeight) push(issues, "SURFACE_HEIGHT_OUT_OF_BOUNDS", `Surface ${cell.x}:${cell.z} has Y=${cell.surfaceY}, expected 0..${config.terrain.maxHeight}.`, `${cell.x}:${cell.z}`, "error");
    if (cell.slope < 0 || cell.slope > 1) push(issues, "SLOPE_OUT_OF_BOUNDS", `Surface ${cell.x}:${cell.z} has normalized slope ${cell.slope}.`, `${cell.x}:${cell.z}`, "error");
  }
  const seenTerrain = new Set<string>();
  for (const cell of world.terrain) {
    const key = coordKey(cell.x, cell.z);
    if (seenTerrain.has(key)) push(issues, "DUPLICATE_TERRAIN_CELL", `Terrain coordinate ${key} is generated more than once.`, key, "error");
    seenTerrain.add(key);
  }
  const blocksByKey = new Map(world.blocks.map(block => [block.key, block]));
  const blocksByGroup = new Map<string, WorldBlock[]>();
  for (const block of world.blocks) {
    validateBlockBounds(block, config, issues);
    const surface = surfaceByCoord.get(coordKey(block.x, block.z));
    if (!surface) {
      if (subjectForBlock(block) !== "water") push(issues, "OBJECT_WITHOUT_SURFACE_CELL", `Block ${block.key} has no generated terrain cell at its X/Z coordinate.`, block.key, "error");
      continue;
    }
    const subject = subjectForBlock(block);
    const surfaceLayer = Math.floor(surface.surfaceY);
    if (subject === "terrain" && block.y !== surfaceLayer) push(issues, "TERRAIN_NOT_ON_SURFACE_LAYER", `Terrain block ${block.key} must be at surface layer ${surfaceLayer}.`, block.key, "error");
    const groupedObject = Boolean(block.groupId && (block.groupId.includes(":") || subject === "structure"));
    if (subject !== "terrain" && subject !== "water" && !groupedObject && block.y < surfaceLayer + 1) push(issues, "GROUND_OBJECT_BURIED", `${subject} block ${block.key} starts below the allowed ground contact layer ${surfaceLayer + 1}.`, block.key);
    const rule = OBSIDIAN_OBJECT_RULES[subject];
    if (subject !== "terrain" && subject !== "water" && !groupedObject && block.y > surfaceLayer + rule.maxHeight) push(issues, "OBJECT_HEIGHT_EXCEEDED", `${subject} block ${block.key} exceeds surface ${surfaceLayer} + max height ${rule.maxHeight}.`, block.key);
    if (block.groupId) blocksByGroup.set(block.groupId, [...(blocksByGroup.get(block.groupId) ?? []), block]);
  }
  for (const [key, block] of blocksByKey) {
    const definition = getBlockDefinition(block.blockId);
    if (definition?.requiresSupport && definition.gravityAffected && block.y > 0 && !blocksByKey.has(blockKey(block.x, block.y - 1, block.z))) push(issues, "UNSUPPORTED_GRAVITY_BLOCK", `Gravity block ${key} requires support at ${block.x}:${block.y - 1}:${block.z}.`, key);
  }
  for (const [groupId, blocks] of blocksByGroup) {
    const subject = subjectForBlock(blocks[0]!);
    if (subject === "tree" || subject === "rock" || subject === "cactus" || subject === "structure") {
      const minimumY = Math.min(...blocks.map(block => block.y));
      const baseBlocks = blocks.filter(block => block.y === minimumY);
      const groundedBase = baseBlocks.some(block => {
        const surface = surfaceByCoord.get(coordKey(block.x, block.z));
        const expected = surface ? Math.floor(surface.surfaceY) + 1 : Number.NaN;
        return Boolean(surface && block.y >= expected && block.y <= expected + 1);
      });
      if (!groundedBase) push(issues, "GROUP_BASE_NOT_GROUNDED", `${groupId} has no base block touching a generated surface layer.`, groupId);
      baseBlocks.forEach(block => {
        const surface = surfaceByCoord.get(coordKey(block.x, block.z));
        if (!surface || block.y < Math.floor(surface.surfaceY) + 1 || block.y > Math.floor(surface.surfaceY) + 2) push(issues, "GROUP_BASE_CONTACT_INVALID", `${groupId} base block ${block.key} is buried or floating beyond one layer.`, groupId);
      });
      const rule = OBSIDIAN_OBJECT_RULES[subject];
      const highest = Math.max(...blocks.map(block => block.y));
      const base = minimumY;
      if (highest > base + rule.maxHeight - 1) push(issues, "GROUP_HEIGHT_EXCEEDED", `${groupId} reaches Y=${highest}, above base ${base} + max height ${rule.maxHeight}.`, groupId);
    }
  }
}

function validateWater(world: GeneratedWorld, config: WorldGeneratorConfig, issues: SpatialIssue[]) {
  const blocksByKey = new Map(world.blocks.map(block => [block.key, block]));
  const seen = new Set<string>();
  for (const water of world.water) {
    const key = blockKey(water.x, water.y, water.z);
    if (seen.has(key)) push(issues, "DUPLICATE_WATER_CELL", `Water coordinate ${key} is generated more than once.`, water.id, "error");
    seen.add(key);
    const cell = nearestCell(world.terrain, water.x, water.z);
    if (!cell || water.y !== Math.floor(cell.surfaceY) + 1) push(issues, "WATER_NOT_ON_SURFACE", `Water ${water.id} must sit one layer above surface.`, water.id);
    const block = blocksByKey.get(key);
    if (block && getBlockDefinition(block.blockId)?.solid) push(issues, "WATER_SOLID_OVERLAP", `Water ${water.id} overlaps solid block ${block.key}.`, water.id);
    if (Math.abs(water.x) > config.radius || Math.abs(water.z) > config.radius) push(issues, "WATER_OUT_OF_BOUNDS", `Water ${water.id} is outside world radius.`, water.id, "error");
  }
}

function validateRecords(world: GeneratedWorld, config: WorldGeneratorConfig, issues: SpatialIssue[]) {
  const structureIds = new Set<string>();
  for (const structure of world.structures) {
    if (structureIds.has(structure.id)) push(issues, "DUPLICATE_STRUCTURE_ID", `Structure ${structure.id} is duplicated.`, structure.id, "error");
    structureIds.add(structure.id);
    const cell = nearestCell(world.terrain, structure.x, structure.z);
    if (!cell || structure.y !== Math.floor(cell.surfaceY) + 1) push(issues, "STRUCTURE_NOT_GROUNDED", `Structure ${structure.id} must start at surface + 1.`, structure.id);
    if (structure.radius <= 0 || structure.radius > 16) push(issues, "STRUCTURE_RADIUS_INVALID", `Structure ${structure.id} radius ${structure.radius} is outside 0..16.`, structure.id, "error");
  }
  for (let left = 0; left < world.structures.length; left += 1) {
    for (let right = left + 1; right < world.structures.length; right += 1) {
      const a = world.structures[left]!;
      const b = world.structures[right]!;
      if (Math.hypot(a.x - b.x, a.z - b.z) < a.radius + b.radius + 1) push(issues, "STRUCTURE_OVERLAP", `Structures ${a.id} and ${b.id} overlap their clearance footprints.`, `${a.id}:${b.id}`);
    }
  }
  // Obsidian permits either a nearby safe route or a remote boss approach. The hard rule is footprint non-overlap above; distance is intentionally seed/config-driven.
  for (const resource of world.resources) validateGroundRecord(resource, world.terrain, config, issues, "RESOURCE_NOT_GROUNDED");
  for (const cave of world.caves) {
    const cell = nearestCell(world.terrain, cave.entranceX, cave.entranceZ);
    if (!cell || cave.entranceY !== Math.floor(cell.surfaceY) + 1) push(issues, "CAVE_ENTRANCE_NOT_GROUNDED", `Cave ${cave.id} entrance must sit one layer above surface.`, cave.id);
    if (cave.depth < 1 || cave.depth > 32 || cave.branchCount < 1 || cave.branchCount > 8) push(issues, "CAVE_DIMENSIONS_INVALID", `Cave ${cave.id} depth/branch count is outside bounded rules.`, cave.id, "error");
  }
  for (const spawn of world.spawnPoints) {
    const structure = spawn.structureId ? world.structures.find(candidate => candidate.id === spawn.structureId) : undefined;
    const cell = nearestCell(world.terrain, spawn.x, spawn.z);
    if (Math.abs(spawn.x) > config.radius + 0.5 || Math.abs(spawn.z) > config.radius + 0.5) push(issues, "SPAWN_OUT_OF_BOUNDS", `Spawn ${spawn.id} is outside world radius plus entity-center allowance.`, spawn.id, "error");
    if (structure) {
      if (Math.abs(spawn.y - (structure.y + 1)) > 0.01) push(issues, "STRUCTURE_SPAWN_HEIGHT_INVALID", `Spawn ${spawn.id} must be on structure ${structure.id} top layer.`, spawn.id);
    } else if (!cell || Math.abs(spawn.y - cell.surfaceY) > 1) push(issues, "SPAWN_FLOATING", `Spawn ${spawn.id} is not within ground-contact tolerance of its surface.`, spawn.id);
  }
}

function validateGroundRecord(record: GeneratedResourceNode | GeneratedSpawnPoint, terrain: GeneratedTerrainCell[], config: WorldGeneratorConfig, issues: SpatialIssue[], code: string) {
  const cell = nearestCell(terrain, record.x, record.z);
  if (!cell || Math.abs(record.y - (Math.floor(cell.surfaceY) + 1)) > 0.01) push(issues, code, `Ground record ${record.id} must be at surface + 1.`, record.id);
  if (Math.abs(record.x) > config.radius || Math.abs(record.z) > config.radius) push(issues, "GROUND_RECORD_OUT_OF_BOUNDS", `Ground record ${record.id} is outside world radius.`, record.id, "error");
}

export function validateGeneratedWorld(world: GeneratedWorld, config: WorldGeneratorConfig): SpatialValidationReport {
  const issues: SpatialIssue[] = [];
  const seenKeys = new Set<string>();
  for (const block of world.blocks) {
    if (seenKeys.has(block.key)) push(issues, "DUPLICATE_BLOCK_KEY", `Block key ${block.key} is duplicated.`, block.key, "error");
    seenKeys.add(block.key);
  }
  validateTerrainAndGroundContact(world, config, issues);
  validateWater(world, config, issues);
  validateRecords(world, config, issues);
  return { valid: issues.length === 0, issues, repairedCount: 0, rulesVersion: OBSIDIAN_SPATIAL_RULES_VERSION };
}

function dropBlockKeysForStructure(world: GeneratedWorld, structureId: string) {
  return new Set(world.blocks.filter(block => block.groupId === structureId).map(block => block.key));
}

export function repairGeneratedWorld(world: GeneratedWorld, config: WorldGeneratorConfig): { world: GeneratedWorld; report: SpatialValidationReport } {
  const first = validateGeneratedWorld(world, config);
  let repairedCount = 0;
  const seen = new Set<string>();
  const blocks = world.blocks.filter(block => {
    if (seen.has(block.key)) { repairedCount += 1; return false; }
    seen.add(block.key);
    const bounds = worldBounds(config);
    if (block.x < bounds.minX || block.x > bounds.maxX || block.y < bounds.minY || block.y > bounds.maxY || block.z < bounds.minZ || block.z > bounds.maxZ) { repairedCount += 1; return false; }
    if (!getBlockDefinition(block.blockId)) { repairedCount += 1; return false; }
    return true;
  });
  const structureIds = new Set<string>();
  const structures: GeneratedWorldStructure[] = [];
  const removedStructureIds = new Set<string>();
  for (const structure of world.structures) {
    if (structureIds.has(structure.id)) { repairedCount += 1; removedStructureIds.add(structure.id); continue; }
    const overlaps = structures.some(existing => Math.hypot(existing.x - structure.x, existing.z - structure.z) < existing.radius + structure.radius + 1);
    if (overlaps) { repairedCount += 1; removedStructureIds.add(structure.id); continue; }
    structures.push(structure);
    structureIds.add(structure.id);
  }
  const removedBlockKeys = new Set<string>();
  removedStructureIds.forEach(id => dropBlockKeysForStructure(world, id).forEach(key => removedBlockKeys.add(key)));
  const repairedBlocks = blocks.filter(block => !removedBlockKeys.has(block.key));
  const water = world.water.filter(cell => {
    const key = blockKey(cell.x, cell.y, cell.z);
    const block = repairedBlocks.find(candidate => candidate.key === key);
    if (block && getBlockDefinition(block.blockId)?.solid) { repairedCount += 1; return false; }
    return true;
  });
  const resources = world.resources.filter(resource => repairedBlocks.some(block => block.x === resource.x && block.y === resource.y && block.z === resource.z) || (repairedCount += 1, false));
  const caves = world.caves.filter(cave => Math.abs(cave.entranceX) <= config.radius && Math.abs(cave.entranceZ) <= config.radius);
  const keptStructureIds = new Set(structures.map(structure => structure.id));
  const spawnPoints = world.spawnPoints.filter(spawn => !spawn.structureId || keptStructureIds.has(spawn.structureId));
  const repairedWorld: GeneratedWorld = { ...world, blocks: repairedBlocks, water, resources, caves, structures, spawnPoints };
  const final = validateGeneratedWorld(repairedWorld, config);
  final.repairedCount = repairedCount;
  if (first.issues.length > 0 && final.issues.length > 0) return { world: repairedWorld, report: final };
  return { world: repairedWorld, report: { ...final, repairedCount } };
}
