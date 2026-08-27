import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { OBSIDIAN_BLOCKS, blockKey, type WorldBlock } from "../client/src/game/data/blockModules";
import { getBlockDefinition } from "../client/src/game/data/blockModules";
import { generateBlockGroup, generateRockBlocks, generateTreeBlocks, type GeneratedBlockGroup } from "../client/src/game/systems/blockWorldSystem";
import { sampleObsidianTerrainHeight } from "../client/src/game/systems/terrainHeight";
import { repairGeneratedWorld, OBSIDIAN_SPATIAL_RULES_VERSION } from "./worldSpatialConstraints";

export const WORLD_GENERATOR_VERSION = "0.1.0";
export const DEFAULT_GENERATOR_MAP_ID = "obsidian-frontier";
export const DEFAULT_GENERATOR_SEED = 9107;
export const DEFAULT_GENERATOR_RADIUS = 32;

export type WorldBiomeId = "obsidian-crags" | "ash-hills" | "ember-steppe" | "aether-vent";

export type WorldGeneratorConfig = {
  mapId: string;
  profileId: string;
  biome: string;
  seed: number;
  radius: number;
  chunkSize: number;
  terrain: {
    baseBlockId: "terrain.ash";
    accentBlockId: "terrain.obsidian";
    maxHeight: number;
    mountainDensity: number;
  };
  water: {
    density: number;
  };
  vegetation: {
    treeDensity: number;
    forestDensity: number;
    rockDensity: number;
    sproutDensity: number;
    cactusDensity: number;
  };
  resources: {
    oreDensity: number;
  };
  caves: {
    density: number;
    maxEntrances: number;
  };
  spawns: {
    regularCount: number;
    animalCount: number;
    npcCount: number;
    bossCount: number;
    monsterDensity: number;
    safeRadius: number;
  };
  structures: {
    safeZoneCount: number;
    shopCount: number;
    npcCampCount: number;
    ruinCount: number;
    bossRoomCount: number;
    density: number;
  };
  difficulty: "peaceful" | "normal" | "hard";
  handAuthoredLandmarks: Array<{
    id: string;
    kind: GeneratedWorldStructure["kind"];
    x: number;
    z: number;
    radius: number;
  }>;
};

export type GeneratedTerrainCell = {
  x: number;
  z: number;
  surfaceY: number;
  elevation: number;
  slope: number;
  moisture: number;
  temperature: number;
  biome: WorldBiomeId;
  topBlockId: string;
};

export type GeneratedWaterCell = {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: "spring" | "stream" | "lake";
  flowDirection: "north" | "east" | "south" | "west" | "still";
};

export type GeneratedCave = {
  id: string;
  entranceX: number;
  entranceY: number;
  entranceZ: number;
  depth: number;
  branchCount: number;
  biome: WorldBiomeId;
};

export type GeneratedResourceNode = {
  id: string;
  x: number;
  y: number;
  z: number;
  definitionId: string;
  rarity: "common" | "uncommon" | "rare";
  biome: WorldBiomeId;
};

export type GeneratedWorldStructure = {
  id: string;
  kind: "safe-zone" | "shop" | "npc-camp" | "ruin" | "boss-room";
  x: number;
  y: number;
  z: number;
  radius: number;
  biome: WorldBiomeId;
  linkedStructureId?: string;
};

export type GeneratedSpawnPoint = {
  id: string;
  x: number;
  y: number;
  z: number;
  role: "regular" | "animal" | "npc" | "boss";
  species: string;
  biome: WorldBiomeId;
  structureId?: string;
};

export type GeneratedWorld = {
  generatorVersion: string;
  mapId: string;
  profileId: string;
  biome: string;
  difficulty: "peaceful" | "normal" | "hard";
  seed: number;
  requestedRadius: number;
  chunkSize: number;
  blocks: WorldBlock[];
  terrain: GeneratedTerrainCell[];
  water: GeneratedWaterCell[];
  caves: GeneratedCave[];
  resources: GeneratedResourceNode[];
  structures: GeneratedWorldStructure[];
  spawnPoints: GeneratedSpawnPoint[];
  metadata: {
    blockFirst: true;
    deterministic: true;
    source: "a-survival-procedural-world-generator";
    systems: string[];
    spatialRulesVersion: string;
    caveRules: "reserved-for-next-obisidian-pass";
    waterRules: "surface-cell-flow-preview";
    hybridGeneration: true;
    playerFacingWorldGenerationUi: false;
    difficulty: "peaceful" | "normal" | "hard";
  };
  worldHash: string;
};

export const DEFAULT_OBSIDIAN_GENERATOR_CONFIG: WorldGeneratorConfig = {
  mapId: DEFAULT_GENERATOR_MAP_ID,
  profileId: "obsidian-frontier-v1",
  biome: "Fantasy Frontier",
  seed: DEFAULT_GENERATOR_SEED,
  radius: DEFAULT_GENERATOR_RADIUS,
  chunkSize: 16,
  terrain: { baseBlockId: "terrain.ash", accentBlockId: "terrain.obsidian", maxHeight: 4, mountainDensity: 0.35 },
  water: { density: 0.2 },
  vegetation: { treeDensity: 0.026, forestDensity: 0.4, rockDensity: 0.072, sproutDensity: 0.022, cactusDensity: 0.008 },
  resources: { oreDensity: 0.012 },
  caves: { density: 0.15, maxEntrances: 8 },
  spawns: { regularCount: 6, animalCount: 5, npcCount: 2, bossCount: 1, monsterDensity: 1, safeRadius: 8 },
  structures: { safeZoneCount: 1, shopCount: 1, npcCampCount: 1, ruinCount: 2, bossRoomCount: 1, density: 1 },
  difficulty: "normal",
  handAuthoredLandmarks: [],
};

function hash2d(seed: number, x: number, z: number, salt: number) {
  let value = (seed ^ Math.imul(x, 0x45d9f3b) ^ Math.imul(z, 0x27d4eb2d) ^ salt) | 0;
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  value = Math.imul(value ^ (value >>> 16), 0x45d9f3b);
  return (value ^ (value >>> 16)) >>> 0;
}

function unitHash(seed: number, x: number, z: number, salt: number) {
  return hash2d(seed, x, z, salt) / 0xffffffff;
}

function normalize(value: number, min: number, max: number) {
  return Math.max(0, Math.min(1, (value - min) / Math.max(1, max - min)));
}

function getCellHeight(seed: number, x: number, z: number, maxHeight: number) {
  const base = sampleObsidianTerrainHeight(x, z);
  // Runtime terrain and backend export share the same canonical height sampler. Seeded variety remains in biome, vegetation, resources, structures and spawns so height alignment is never sacrificed for density noise.
  void seed;
  return Math.max(0, Math.min(maxHeight, base));
}

function getCell(seed: number, x: number, z: number, maxHeight: number, mountainDensity: number): GeneratedTerrainCell {
  const surfaceY = getCellHeight(seed, x, z, maxHeight);
  const north = getCellHeight(seed, x, z - 1, maxHeight);
  const east = getCellHeight(seed, x + 1, z, maxHeight);
  const slope = Math.min(1, (Math.abs(surfaceY - north) + Math.abs(surfaceY - east)) / 4);
  const moisture = unitHash(seed, x, z, 211);
  const temperature = unitHash(seed, x, z, 307);
  const elevation = normalize(surfaceY, 0, maxHeight);
  const biome: WorldBiomeId = elevation > 1 - mountainDensity && slope > 0.25
    ? "obsidian-crags"
    : moisture > 0.62
      ? "aether-vent"
      : temperature > 0.62
        ? "ember-steppe"
        : "ash-hills";
  const accent = unitHash(seed, x, z, 401) > 0.86 || biome === "obsidian-crags";
  return { x, z, surfaceY, elevation, slope, moisture, temperature, biome, topBlockId: accent ? "terrain.obsidian" : "terrain.ash" };
}

function createTerrainBlock(config: WorldGeneratorConfig, cell: GeneratedTerrainCell): WorldBlock {
  const y = Math.max(0, Math.floor(cell.surfaceY));
  const blockId = cell.topBlockId as keyof typeof OBSIDIAN_BLOCKS;
  const definition = getBlockDefinition(blockId)!;
  return {
    key: blockKey(cell.x, y, cell.z),
    blockId,
    moduleId: "terrain.surface.obsidian-frontier",
    groupId: `terrain:${cell.x}:${cell.z}`,
    x: cell.x,
    y,
    z: cell.z,
    state: "intact",
    hitPoints: Math.max(1, definition.hardness),
    maxHitPoints: Math.max(1, definition.hardness),
    solid: definition.solid,
    seed: config.seed,
  };
}

function createSproutGroup(config: WorldGeneratorConfig, cell: GeneratedTerrainCell, index: number): GeneratedBlockGroup {
  return generateBlockGroup({
    moduleId: "flora.plant.obsidian-frontier",
    groupId: `sprout:${cell.x}:${cell.z}:${index}`,
    seed: config.seed + index,
    offsets: [{ x: cell.x, y: Math.floor(cell.surfaceY) + 1, z: cell.z, blockId: "flora.obsidian.sprout" }],
  });
}

function createCactusGroup(config: WorldGeneratorConfig, cell: GeneratedTerrainCell, index: number): GeneratedBlockGroup {
  return generateBlockGroup({
    moduleId: "flora.thorn-cactus.obsidian-frontier",
    groupId: `cactus:${cell.x}:${cell.z}:${index}`,
    seed: config.seed + 1000 + index,
    offsets: [{ x: cell.x, y: Math.floor(cell.surfaceY) + 1, z: cell.z, blockId: "flora.obsidian.thorn-cactus" }],
  });
}

function sortedCandidates(cells: GeneratedTerrainCell[], seed: number, salt: number) {
  return cells.slice().sort((a, b) => unitHash(seed, a.x, a.z, salt) - unitHash(seed, b.x, b.z, salt));
}

function structureOverlaps(candidate: GeneratedTerrainCell, radius: number, structures: GeneratedWorldStructure[]) {
  return structures.some(structure => Math.hypot(candidate.x - structure.x, candidate.z - structure.z) < radius + structure.radius + 1);
}

function chooseStructureCell(cells: GeneratedTerrainCell[], seed: number, salt: number, radius: number, structures: GeneratedWorldStructure[]) {
  return sortedCandidates(cells, seed, salt).find(cell => cell.slope < 0.5 && !structureOverlaps(cell, radius, structures)) ?? sortedCandidates(cells, seed, salt + 1)[0]!;
}

function createStructureBlocks(structure: GeneratedWorldStructure, seed: number): GeneratedBlockGroup {
  const footprint = Math.max(1, Math.min(4, Math.floor(structure.radius / 2)));
  const offsets = [] as Array<{ x: number; y: number; z: number; blockId: string }>;
  for (let dx = -footprint; dx <= footprint; dx += 1) {
    for (let dz = -footprint; dz <= footprint; dz += 1) {
      const perimeter = Math.abs(dx) === footprint || Math.abs(dz) === footprint;
      if (structure.kind === "ruin" && !perimeter && (Math.abs(dx) + Math.abs(dz)) % 2 === 1) continue;
      offsets.push({ x: structure.x + dx, y: structure.y, z: structure.z + dz, blockId: "obstacle.obsidian.slab" });
      if (perimeter && structure.kind === "boss-room" && Math.abs(dx) + Math.abs(dz) > footprint) {
        offsets.push({ x: structure.x + dx, y: structure.y + 1, z: structure.z + dz, blockId: "obstacle.obsidian.slab" });
      }
    }
  }
  return generateBlockGroup({ moduleId: `structure.${structure.kind}.obsidian-frontier`, groupId: structure.id, seed, offsets });
}

function createWaterBlock(cell: GeneratedWaterCell, seed: number): WorldBlock {
  const definition = getBlockDefinition("water.obsidian.surface")!;
  return {
    key: blockKey(cell.x, cell.y, cell.z),
    blockId: "water.obsidian.surface",
    moduleId: "water.surface.obsidian-frontier",
    groupId: `water:${cell.id}`,
    x: cell.x,
    y: cell.y,
    z: cell.z,
    state: "intact",
    hitPoints: Math.max(1, definition.hardness),
    maxHitPoints: Math.max(1, definition.hardness),
    solid: false,
    seed,
  };
}

function createWaterCells(config: WorldGeneratorConfig, cells: GeneratedTerrainCell[]): GeneratedWaterCell[] {
  const candidates = sortedCandidates(cells.filter(cell => cell.surfaceY <= 1.5 && cell.moisture > 0.72 && cell.slope < 0.5), config.seed, 811);
  const targetCount = config.water.density <= 0 ? 0 : Math.min(96, Math.max(4, Math.floor(cells.length * 0.045 * (config.water.density / 0.2))));
  const selected = candidates.slice(0, targetCount);
  return selected.map((cell, index) => {
    const neighbors = [
      { direction: "north" as const, y: getCellHeight(config.seed, cell.x, cell.z - 1, config.terrain.maxHeight) },
      { direction: "east" as const, y: getCellHeight(config.seed, cell.x + 1, cell.z, config.terrain.maxHeight) },
      { direction: "south" as const, y: getCellHeight(config.seed, cell.x, cell.z + 1, config.terrain.maxHeight) },
      { direction: "west" as const, y: getCellHeight(config.seed, cell.x - 1, cell.z, config.terrain.maxHeight) },
    ];
    const lower = neighbors.slice().sort((a, b) => a.y - b.y)[0]!;
    return {
      id: `water-${index + 1}`,
      x: cell.x,
      y: Math.floor(cell.surfaceY) + 1,
      z: cell.z,
      kind: cell.slope > 0.2 ? "spring" : cell.moisture > 0.88 ? "lake" : "stream",
      flowDirection: lower.y < cell.surfaceY ? lower.direction : "still",
    };
  });
}

function createCaveRecords(config: WorldGeneratorConfig, cells: GeneratedTerrainCell[]): GeneratedCave[] {
  const elevatedCandidates = cells.filter(cell => cell.elevation > 0.35 && cell.slope > 0.18);
  const candidates = sortedCandidates(elevatedCandidates.length > 0 ? elevatedCandidates : cells.filter(cell => cell.surfaceY > 0), config.seed, 10001);
  const count = config.caves.density <= 0 || candidates.length === 0 ? 0 : Math.min(config.caves.maxEntrances, Math.max(1, Math.floor(candidates.length * config.caves.density * 0.08)));
  return candidates.slice(0, Math.max(0, count)).map((cell, index) => ({
    id: `cave-entrance-${index + 1}`,
    entranceX: cell.x,
    entranceY: Math.floor(cell.surfaceY) + 1,
    entranceZ: cell.z,
    depth: 4 + Math.floor(unitHash(config.seed, cell.x, cell.z, 10011) * 12),
    branchCount: 1 + Math.floor(unitHash(config.seed, cell.x, cell.z, 10013) * 4),
    biome: cell.biome,
  }));
}

function createResourceNodes(config: WorldGeneratorConfig, cells: GeneratedTerrainCell[], existing: Map<string, WorldBlock>): GeneratedResourceNode[] {
  const candidates = sortedCandidates(cells.filter(cell => cell.slope > 0.16 || cell.biome === "obsidian-crags" || cell.biome === "aether-vent"), config.seed, 10101);
  const count = config.resources.oreDensity <= 0 ? 0 : Math.min(candidates.length, Math.max(1, Math.floor(cells.length * config.resources.oreDensity * 2)));
  const nodes: GeneratedResourceNode[] = [];
  for (const cell of candidates) {
    if (nodes.length >= count) break;
    const y = Math.floor(cell.surfaceY) + 1;
    const key = blockKey(cell.x, y, cell.z);
    if (existing.has(key)) continue;
    const rarity: GeneratedResourceNode["rarity"] = unitHash(config.seed, cell.x, cell.z, 10111) > 0.94 ? "rare" : unitHash(config.seed, cell.x, cell.z, 10113) > 0.68 ? "uncommon" : "common";
    nodes.push({ id: `resource-${nodes.length + 1}`, x: cell.x, y, z: cell.z, definitionId: "ore.aether.block", rarity, biome: cell.biome });
  }
  return nodes;
}

function createSpawnPoints(config: WorldGeneratorConfig, cells: GeneratedTerrainCell[], structures: GeneratedWorldStructure[], water: GeneratedWaterCell[]): GeneratedSpawnPoint[] {
  const safe = structures.find(structure => structure.kind === "safe-zone");
  const bossRoom = structures.find(structure => structure.kind === "boss-room");
  const shop = structures.find(structure => structure.kind === "shop");
  const npcCamp = structures.find(structure => structure.kind === "npc-camp");
  const regularCells = sortedCandidates(cells.filter(cell => !safe || Math.hypot(cell.x - safe.x, cell.z - safe.z) > safe.radius + 3 && cell.slope < 0.6), config.seed, 907);
  const regularCount = config.difficulty === "peaceful" ? 0 : Math.max(0, Math.round(config.spawns.regularCount * config.spawns.monsterDensity * (config.difficulty === "hard" ? 1.35 : 1)));
  const bossCount = config.difficulty === "peaceful" ? 0 : config.spawns.bossCount;
  const animalCells = sortedCandidates(cells.filter(cell => cell.slope < 0.35 && (water.some(source => Math.hypot(source.x - cell.x, source.z - cell.z) <= 5) || cell.moisture > 0.58)), config.seed, 919);
  const points: GeneratedSpawnPoint[] = [];
  const clampSpawnCenter = (value: number) => Math.max(-config.radius + 0.5, Math.min(config.radius - 0.5, value));
  for (let index = 0; index < regularCount; index += 1) {
    const cell = regularCells[index % Math.max(1, regularCells.length)] ?? cells[index % cells.length]!;
    points.push({ id: `regular-${index + 1}`, x: clampSpawnCenter(cell.x + 0.5), y: cell.surfaceY, z: clampSpawnCenter(cell.z + 0.5), role: "regular", species: cell.biome === "obsidian-crags" ? "obsidian-shell-stalker" : "glass-stalker", biome: cell.biome });
  }
  for (let index = 0; index < config.spawns.animalCount; index += 1) {
    const cell = animalCells[index % Math.max(1, animalCells.length)] ?? cells[index % cells.length]!;
    points.push({ id: `animal-${index + 1}`, x: clampSpawnCenter(cell.x + 0.5), y: cell.surfaceY, z: clampSpawnCenter(cell.z + 0.5), role: "animal", species: cell.biome === "aether-vent" ? "aether-moth" : "ash-hare", biome: cell.biome });
  }
  for (let index = 0; index < config.spawns.npcCount; index += 1) {
    const structure = [npcCamp, shop, safe].filter((value): value is GeneratedWorldStructure => Boolean(value))[index % 3];
    if (!structure) continue;
    points.push({ id: `npc-${index + 1}`, x: clampSpawnCenter(structure.x + 0.5), y: structure.y + 1, z: clampSpawnCenter(structure.z + 0.5), role: "npc", species: index % 2 === 0 ? "frontier-cartographer" : "aether-trader", biome: structure.biome, structureId: structure.id });
  }
  for (let index = 0; index < bossCount; index += 1) {
    const structure = bossRoom ?? structures[structures.length - 1];
    if (!structure) continue;
    points.push({ id: `boss-${index + 1}`, x: clampSpawnCenter(structure.x + 0.5), y: structure.y + 1, z: clampSpawnCenter(structure.z + 0.5), role: "boss", species: "void-reaper", biome: structure.biome, structureId: structure.id });
  }
  return points;
}

export function generateWorld(configInput: Partial<WorldGeneratorConfig> = {}): GeneratedWorld {
  const config: WorldGeneratorConfig = {
    ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG,
    ...configInput,
    terrain: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.terrain, ...(configInput.terrain ?? {}) },
    water: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.water, ...(configInput.water ?? {}) },
    vegetation: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation, ...(configInput.vegetation ?? {}) },
    resources: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.resources, ...(configInput.resources ?? {}) },
    caves: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.caves, ...(configInput.caves ?? {}) },
    spawns: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns, ...(configInput.spawns ?? {}) },
    structures: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.structures, ...(configInput.structures ?? {}) },
    handAuthoredLandmarks: configInput.handAuthoredLandmarks ?? DEFAULT_OBSIDIAN_GENERATOR_CONFIG.handAuthoredLandmarks,
  };
  if (config.mapId !== DEFAULT_GENERATOR_MAP_ID) throw new Error(`Only ${DEFAULT_GENERATOR_MAP_ID} is enabled until the vertical slice is complete.`);
  const terrain: GeneratedTerrainCell[] = [];
  const blocksByKey = new Map<string, WorldBlock>();
  const addGeneratedBlocks = (generated: GeneratedBlockGroup) => {
    const candidates = generated.blocks.filter(block => Math.abs(block.x) <= config.radius && Math.abs(block.z) <= config.radius);
    if (candidates.length === 0) return;
    const requiresGroundContact = candidates.some(block => {
      const definition = getBlockDefinition(block.blockId);
      return definition?.kind !== "leaf" && definition?.kind !== "liquid" && !definition?.canFloat;
    });
    if (requiresGroundContact) {
      const lowestY = Math.min(...candidates.map(block => block.y));
      const hasGroundedBase = candidates.some(block => {
        if (block.y !== lowestY) return false;
        const surface = terrain.find(cell => cell.x === block.x && cell.z === block.z);
        return Boolean(surface && block.y >= Math.floor(surface.surfaceY) + 1 && block.y <= Math.floor(surface.surfaceY) + 2);
      });
      if (!hasGroundedBase) return;
    }
    candidates.forEach(block => {
      if (blocksByKey.has(block.key)) return;
      blocksByKey.set(block.key, block);
    });
  };
  for (let x = -config.radius; x <= config.radius; x += 1) {
    for (let z = -config.radius; z <= config.radius; z += 1) {
      const cell = getCell(config.seed, x, z, config.terrain.maxHeight, config.terrain.mountainDensity);
      terrain.push(cell);
      const surface = createTerrainBlock(config, cell);
      blocksByKey.set(surface.key, surface);
      const index = terrain.length;
      const treeEligible = cell.biome === "ash-hills" && cell.slope < 0.45 && unitHash(config.seed, x, z, 503) < config.vegetation.treeDensity * config.vegetation.forestDensity;
      if (treeEligible) {
        const group = generateTreeBlocks({ x, z, seed: config.seed + index, baseY: Math.floor(cell.surfaceY) + 1 });
        addGeneratedBlocks(group);
      }
      const rockEligible = cell.slope > 0.18 || unitHash(config.seed, x, z, 601) < config.vegetation.rockDensity;
      if (rockEligible && unitHash(config.seed, x, z, 607) < config.vegetation.rockDensity) {
        const group = generateRockBlocks({ x, z, seed: config.seed + 2000 + index, baseY: Math.floor(cell.surfaceY) + 1 });
        addGeneratedBlocks(group);
      }
      if (cell.biome === "ember-steppe" && unitHash(config.seed, x, z, 701) < config.vegetation.cactusDensity) {
        addGeneratedBlocks(createCactusGroup(config, cell, index));
      } else if (cell.biome !== "obsidian-crags" && unitHash(config.seed, x, z, 709) < config.vegetation.sproutDensity) {
        addGeneratedBlocks(createSproutGroup(config, cell, index));
      }
    }
  }
  if (!Array.from(blocksByKey.values()).some(block => getBlockDefinition(block.blockId)?.kind === "plant")) {
    const fallbackPlantCell = terrain.find(cell => cell.biome !== "obsidian-crags" && !blocksByKey.has(blockKey(cell.x, Math.floor(cell.surfaceY), cell.z))) ?? terrain.find(cell => !blocksByKey.has(blockKey(cell.x, Math.floor(cell.surfaceY), cell.z))) ?? terrain[0]!;
    addGeneratedBlocks(createSproutGroup(config, fallbackPlantCell, terrain.length + 1));
  }
  terrain.sort((a, b) => a.x - b.x || a.z - b.z);
  const water = createWaterCells(config, terrain);
  water.forEach(cell => {
    const waterBlock = createWaterBlock(cell, config.seed);
    if (!blocksByKey.has(waterBlock.key)) blocksByKey.set(waterBlock.key, waterBlock);
  });
  const caves = createCaveRecords(config, terrain);
  const resources = createResourceNodes(config, terrain, blocksByKey);
  resources.forEach(resource => {
    addGeneratedBlocks(generateBlockGroup({
      moduleId: "resource.ore.obsidian-frontier",
      groupId: resource.id,
      seed: config.seed + resource.x * 17 + resource.z * 31,
      offsets: [{ x: resource.x, y: resource.y, z: resource.z, blockId: resource.definitionId }],
    }));
  });
  const structures: GeneratedWorldStructure[] = [];
  config.handAuthoredLandmarks.forEach(landmark => {
    if (Math.abs(landmark.x) > config.radius || Math.abs(landmark.z) > config.radius) return;
    const cell = terrain.reduce((nearest, candidate) => Math.hypot(candidate.x - landmark.x, candidate.z - landmark.z) < Math.hypot(nearest.x - landmark.x, nearest.z - landmark.z) ? candidate : nearest, terrain[0]!);
    const structure: GeneratedWorldStructure = { id: landmark.id, kind: landmark.kind, x: landmark.x, y: Math.floor(cell.surfaceY) + 1, z: landmark.z, radius: landmark.radius, biome: cell.biome };
    structures.push(structure);
    addGeneratedBlocks(createStructureBlocks(structure, config.seed + landmark.x * 19 + landmark.z * 23));
  });
  const addStructures = (kind: GeneratedWorldStructure["kind"], count: number, radius: number, salt: number) => {
    const enabledCount = config.structures.density <= 0 ? 0 : Math.round(count * config.structures.density);
    for (let index = 0; index < enabledCount; index += 1) {
      const candidates = sortedCandidates(terrain, config.seed, salt + index);
      const cell = candidates.find(candidate => candidate.slope < 0.5 && !structureOverlaps(candidate, radius, structures) && !blocksByKey.has(blockKey(candidate.x, Math.floor(candidate.surfaceY) + 1, candidate.z))) ?? candidates[index % candidates.length]!;
      const structure: GeneratedWorldStructure = { id: `${kind}-${index + 1}`, kind, x: cell.x, y: Math.floor(cell.surfaceY) + 1, z: cell.z, radius, biome: cell.biome };
      structures.push(structure);
      addGeneratedBlocks(createStructureBlocks(structure, config.seed + salt + index));
    }
  };
  addStructures("safe-zone", config.structures.safeZoneCount, 3, 1001);
  addStructures("shop", config.structures.shopCount, 2, 1101);
  addStructures("npc-camp", config.structures.npcCampCount, 2, 1201);
  addStructures("ruin", config.structures.ruinCount, 2, 1301);
  addStructures("boss-room", config.structures.bossRoomCount, 4, 1401);
  const safeZone = structures.find(structure => structure.kind === "safe-zone");
  const shop = structures.find(structure => structure.kind === "shop");
  if (safeZone && shop) shop.linkedStructureId = safeZone.id;
  const blocks = Array.from(blocksByKey.values()).sort((a, b) => a.key.localeCompare(b.key));
  const spawnPoints = createSpawnPoints(config, terrain, structures, water);
  const payload: GeneratedWorld = { generatorVersion: WORLD_GENERATOR_VERSION, mapId: config.mapId, profileId: config.profileId, biome: config.biome, difficulty: config.difficulty, seed: config.seed, requestedRadius: config.radius, chunkSize: config.chunkSize, blocks, terrain, water, caves, resources, structures, spawnPoints, metadata: { blockFirst: true as const, deterministic: true as const, source: "a-survival-procedural-world-generator" as const, hybridGeneration: true as const, playerFacingWorldGenerationUi: false as const, difficulty: config.difficulty, systems: ["seed", "world-bounds", "height-layers", "terrain", "water", "biome", "vegetation", "resources", "caves", "structures", "spawns", "events", "spatial-validation", "map-export"], spatialRulesVersion: OBSIDIAN_SPATIAL_RULES_VERSION, caveRules: "reserved-for-next-obisidian-pass" as const, waterRules: "surface-cell-flow-preview" as const } };
  const repaired = repairGeneratedWorld(payload, config);
  if (!repaired.report.valid) {
    const issues = repaired.report.issues.slice(0, 5).map(issue => `${issue.code}:${issue.subjectId ?? "world"}`).join(", ");
    throw new Error(`Spatial validation failed after repair (${repaired.report.repairedCount} repaired): ${issues}`);
  }
  const worldHash = createHash("sha256").update(JSON.stringify(repaired.world)).digest("hex");
  return { ...repaired.world, worldHash };
}

function readArg(name: string, fallback: string) {
  const prefix = `--${name}=`;
  return process.argv.find(arg => arg.startsWith(prefix))?.slice(prefix.length) ?? fallback;
}

function readNumber(name: string, fallback: number, min: number, max: number) {
  const value = Number(readArg(name, String(fallback)));
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

function readSeed() {
  const raw = readArg("seed", String(DEFAULT_GENERATOR_SEED));
  if (raw.toLowerCase() === "random") return Math.floor(Math.random() * 2_000_000_000);
  const value = Number(raw);
  return Number.isFinite(value) ? Math.trunc(value) : DEFAULT_GENERATOR_SEED;
}

async function writeWorldExport(world: GeneratedWorld, output: string, format: string, includePreview: boolean) {
  if (format === "module") {
    await mkdir(output, { recursive: true });
    const files: Record<string, unknown> = {
      "manifest.json": { mapId: world.mapId, profileId: world.profileId, generatorVersion: world.generatorVersion, seed: world.seed, radius: world.requestedRadius, chunkSize: world.chunkSize, worldHash: world.worldHash, blockFirst: world.metadata.blockFirst },
      "terrain.json": world.terrain,
      "blocks.json": world.blocks,
      "biomes.json": world.terrain.map(cell => ({ x: cell.x, z: cell.z, biome: cell.biome })),
      "water.json": world.water,
      "resources.json": world.resources,
      "caves.json": world.caves,
      "structures.json": world.structures,
      "spawns.json": world.spawnPoints,
      "metadata.json": world.metadata,
    };
    if (includePreview) {
      files["preview.json"] = {
        heightMap: world.terrain.map(cell => ({ x: cell.x, z: cell.z, height: cell.surfaceY })),
        biomeMap: world.terrain.map(cell => ({ x: cell.x, z: cell.z, biome: cell.biome })),
        waterMap: world.water,
        resourceMap: world.resources,
        structureMap: world.structures,
        spawnMap: world.spawnPoints,
      };
    }
    await Promise.all(Object.entries(files).map(([name, value]) => writeFile(resolve(output, name), `${JSON.stringify(value, null, 2)}\n`, "utf8")));
    return;
  }
  await mkdir(resolve(output, ".."), { recursive: true });
  await writeFile(output, `${JSON.stringify(world, null, 2)}\n`, "utf8");
}

async function main() {
  if (process.argv.includes("--help")) {
    console.log("A-Survival Procedural World Generator\nUsage: pnpm world:generate -- --map=obsidian-frontier --seed=9107 --radius=32 --format=module --out=artifacts/obsidian-world --preview=true\nBackend only: no in-game world-generation button is exposed.");
    return;
  }
  const config = {
    mapId: readArg("map", DEFAULT_GENERATOR_MAP_ID),
    profileId: readArg("profile", "obsidian-frontier-v1"),
    biome: readArg("biome", "Fantasy Frontier"),
    seed: readSeed(),
    radius: readNumber("radius", DEFAULT_GENERATOR_RADIUS, 1, 500),
    terrain: { mountainDensity: readNumber("mountain-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.terrain.mountainDensity, 0, 1) },
    water: { density: readNumber("water-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.water.density, 0, 1) },
    vegetation: {
      forestDensity: readNumber("forest-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation.forestDensity, 0, 1),
      treeDensity: readNumber("tree-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation.treeDensity, 0, 1),
      rockDensity: readNumber("rock-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation.rockDensity, 0, 1),
      sproutDensity: readNumber("sprout-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation.sproutDensity, 0, 1),
      cactusDensity: readNumber("cactus-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation.cactusDensity, 0, 1),
    },
    resources: { oreDensity: readNumber("resource-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.resources.oreDensity, 0, 1) },
    caves: { density: readNumber("cave-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.caves.density, 0, 1) },
    spawns: {
      regularCount: readNumber("monster-count", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns.regularCount, 0, 100),
      animalCount: readNumber("animal-count", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns.animalCount, 0, 100),
      npcCount: readNumber("npc-count", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns.npcCount, 0, 20),
      bossCount: readNumber("boss-count", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns.bossCount, 0, 10),
      monsterDensity: readNumber("monster-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.spawns.monsterDensity, 0, 2),
    },
    structures: { density: readNumber("structure-density", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.structures.density, 0, 1) },
    difficulty: readArg("difficulty", DEFAULT_OBSIDIAN_GENERATOR_CONFIG.difficulty) as WorldGeneratorConfig["difficulty"],
  } satisfies Partial<WorldGeneratorConfig>;
  const output = resolve(process.cwd(), readArg("out", "artifacts/obsidian-frontier-world.json"));
  const format = readArg("format", "json");
  const includePreview = readArg("preview", "false").toLowerCase() === "true";
  const world = generateWorld(config);
  await writeWorldExport(world, output, format, includePreview);
  console.log(JSON.stringify({ output, format, preview: includePreview, mapId: world.mapId, profileId: world.profileId, seed: world.seed, radius: world.requestedRadius, blocks: world.blocks.length, terrainCells: world.terrain.length, waterCells: world.water.length, caves: world.caves.length, resources: world.resources.length, structures: world.structures.length, spawnPoints: world.spawnPoints.length, worldHash: world.worldHash }, null, 2));
}

if (process.argv[1]?.endsWith("world-generator.ts")) void main();
