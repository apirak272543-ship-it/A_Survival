import { describe, expect, it } from "vitest";
import { getBlockDefinition } from "../client/src/game/data/blockModules";
import { DEFAULT_OBSIDIAN_GENERATOR_CONFIG, generateWorld } from "../tools/world-generator";
import { canPlaceWorldObject, getSurfaceInfo, OBSIDIAN_HEIGHT_LAYERS, repairGeneratedWorld, validateGeneratedWorld } from "../tools/worldSpatialConstraints";

describe("A-Survival Procedural World Generator", () => {
  it("reproduces the same world for the same seed and config", () => {
    const config = { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 10, seed: 9107 };
    const first = generateWorld(config);
    const second = generateWorld(config);
    expect(second).toEqual(first);
    expect(first.metadata.blockFirst).toBe(true);
    expect(first.metadata.deterministic).toBe(true);
  });

  it("changes the world hash and terrain for a different seed", () => {
    const first = generateWorld({ ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 10, seed: 9107 });
    const second = generateWorld({ ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 10, seed: 9108 });
    expect(second.worldHash).not.toBe(first.worldHash);
    expect(second.terrain).not.toEqual(first.terrain);
  });

  it("exports unique bounded WorldBlock records instead of monolithic props", () => {
    const world = generateWorld({ ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 12, seed: 1731, vegetation: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation, treeDensity: 0.2, sproutDensity: 1, cactusDensity: 1 } });
    const keys = new Set(world.blocks.map(block => block.key));
    expect(keys.size).toBe(world.blocks.length);
    expect(world.blocks.every(block => Math.abs(block.x) <= 12 && Math.abs(block.z) <= 12 && block.y >= 0)).toBe(true);
    expect(world.blocks.every(block => Boolean(getBlockDefinition(block.blockId)))).toBe(true);
    expect(world.blocks.some(block => block.blockId === "wood.obsidian.log")).toBe(true);
    expect(world.blocks.some(block => block.blockId === "leaves.obsidian")).toBe(true);
    expect(world.blocks.some(block => block.blockId === "flora.obsidian.sprout" || block.blockId === "flora.obsidian.thorn-cactus")).toBe(true);
    expect(world.blocks.every(block => typeof block.groupId === "string" && block.groupId.length > 0)).toBe(true);
  });

  it("exports water, caves, resources, structures, NPCs, animals, monsters and a boss", () => {
    const world = generateWorld({ ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 20, seed: 827364, vegetation: { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG.vegetation, treeDensity: 0.08, sproutDensity: 0.08 } });
    expect(world.water.length).toBeGreaterThan(0);
    expect(world.caves.length).toBeGreaterThan(0);
    expect(world.resources.length).toBeGreaterThan(0);
    expect(world.structures.map(structure => structure.kind)).toEqual(expect.arrayContaining(["safe-zone", "shop", "npc-camp", "ruin", "boss-room"]));
    expect(world.spawnPoints.map(point => point.role)).toEqual(expect.arrayContaining(["regular", "animal", "npc", "boss"]));
    expect(world.structures.every(structure => Math.abs(structure.x) <= 20 && Math.abs(structure.z) <= 20)).toBe(true);
    expect(world.spawnPoints.every(point => Math.abs(point.x) <= 20.5 && Math.abs(point.z) <= 20.5)).toBe(true);
    expect(world.metadata.hybridGeneration).toBe(true);
    expect(world.metadata.playerFacingWorldGenerationUi).toBe(false);
  });

  it("keeps hand-authored landmarks deterministic while allowing random companions", () => {
    const config = { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 18, seed: 827364, handAuthoredLandmarks: [{ id: "story-citadel", kind: "boss-room" as const, x: 0, z: 0, radius: 3 }] };
    const first = generateWorld(config);
    const second = generateWorld(config);
    expect(first).toEqual(second);
    expect(first.structures.find(structure => structure.id === "story-citadel")).toMatchObject({ kind: "boss-room", x: 0, z: 0 });
  });

  it("emits a valid hard spatial contract for every generated layer", () => {
    const config = { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 20, seed: 827364 };
    const world = generateWorld(config);
    const report = validateGeneratedWorld(world, config);
    expect(report.valid).toBe(true);
    expect(report.issues).toEqual([]);
    expect(world.metadata.spatialRulesVersion).toBe("obsidian-spatial-v1");
    expect(world.terrain.every(cell => cell.surfaceY >= OBSIDIAN_HEIGHT_LAYERS.surface.minY && cell.surfaceY <= OBSIDIAN_HEIGHT_LAYERS.surface.maxY)).toBe(true);
    expect(world.water.every(water => water.y === Math.floor(world.terrain.find(cell => cell.x === water.x && cell.z === water.z)!.surfaceY) + 1)).toBe(true);
    expect(world.structures.every(structure => structure.y === Math.floor(world.terrain.find(cell => cell.x === structure.x && cell.z === structure.z)!.surfaceY) + 1)).toBe(true);
    expect(world.spawnPoints.every(point => point.y >= OBSIDIAN_HEIGHT_LAYERS.surface.minY && point.y <= OBSIDIAN_HEIGHT_LAYERS.structure.maxY + 1)).toBe(true);
  });

  it("rejects and repairs corrupted positions instead of exporting them", () => {
    const config = { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 12, seed: 1731 };
    const world = generateWorld(config);
    const corrupted = {
      ...world,
      blocks: [...world.blocks, { ...world.blocks[0]!, key: "999:99:999", x: 999, y: 99, z: 999 }],
      structures: [...world.structures, { ...world.structures[0]!, id: "duplicate-structure", x: 999, z: 999 }],
    };
    const report = validateGeneratedWorld(corrupted, config);
    expect(report.valid).toBe(false);
    expect(report.issues.some(issue => issue.code === "BLOCK_OUT_OF_WORLD_BOUNDS")).toBe(true);
    const repaired = repairGeneratedWorld(corrupted, config);
    expect(repaired.report.valid).toBe(true);
    expect(repaired.world.blocks.every(block => Math.abs(block.x) <= 12 && Math.abs(block.z) <= 12 && block.y <= OBSIDIAN_HEIGHT_LAYERS.structure.maxY)).toBe(true);
  });

  it("provides one surface query and placement engine for every content generator", () => {
    const config = { ...DEFAULT_OBSIDIAN_GENERATOR_CONFIG, radius: 20, seed: 827364 };
    const world = generateWorld(config);
    const surface = getSurfaceInfo(world, 0, 0);
    expect(surface).toMatchObject({ x: 0, z: 0, surfaceBlockId: expect.any(String), biome: expect.any(String) });
    expect(canPlaceWorldObject(world, config, { id: "tree-valid", x: 0, y: Math.floor(surface!.surfaceY) + 1, z: 0, subject: "tree", allowedBiomes: [surface!.biome], maxWaterDepth: 0 })).toMatchObject({ accepted: true });
    expect(canPlaceWorldObject(world, config, { id: "tree-outside", x: 99, z: 99, subject: "tree" })).toMatchObject({ accepted: false, reason: "outside world bounds" });
    expect(canPlaceWorldObject(world, config, { id: "tree-too-high", x: 0, y: 99, z: 0, subject: "tree" })).toMatchObject({ accepted: false });
    expect(canPlaceWorldObject(world, config, { id: "wrong-biome", x: 0, z: 0, subject: "tree", allowedBiomes: ["never-a-real-obsidian-biome"] })).toMatchObject({ accepted: false });
  });

  it("refuses future maps until Obsidian Frontier is approved", () => {
    expect(() => generateWorld({ mapId: "map-002-ashen-obsidian-plains" })).toThrow(/obsidian-frontier/);
  });
});
