import { describe, expect, it } from "vitest";
import {
  DEFAULT_GENERATOR_MAP_ID,
  DEFAULT_OBSIDIAN_GENERATOR_CONFIG,
} from "../tools/world-generator";
import {
  WORLD_GENERATOR_COVERAGE_GRAPH_RULES_VERSION,
  WORLD_GENERATOR_COVERAGE_MAX_RADIUS,
  WORLD_GENERATOR_COVERAGE_MIN_RADIUS,
  buildWorldGeneratorCoverageDependencyGraph,
  getDefaultWorldGeneratorCoverageDependencyGraphInput,
} from "./generators/worldGeneratorCoverageDependencyGraph";

describe("world generator coverage dependency graph", () => {
  it("audits deterministic backend-only Obsidian output across required world domains", () => {
    const result = buildWorldGeneratorCoverageDependencyGraph(getDefaultWorldGeneratorCoverageDependencyGraphInput());

    expect(result.summary).toMatchObject({
      mapId: DEFAULT_GENERATOR_MAP_ID,
      seed: DEFAULT_OBSIDIAN_GENERATOR_CONFIG.seed,
      radius: DEFAULT_OBSIDIAN_GENERATOR_CONFIG.radius,
      generatorVersion: "0.1.0",
      deterministic: true,
      backendOnly: true,
      playerFacingWorldGenerationUi: false,
      repeatHashMatches: true,
      validation: { valid: true, errorCount: 0 },
      requiredCoverage: {
        terrain: true,
        water: true,
        tree: true,
        vegetation: true,
        resources: true,
        caves: true,
        safeZone: true,
        shop: true,
        npcCamp: true,
        bossRoom: true,
        regularSpawn: true,
        animalSpawn: true,
        npcSpawn: true,
        bossSpawn: true,
      },
      owners: { deterministicGenerator: true, spatialValidation: true, moduleExport: true, playerGeneratorUi: false, runtimeMapSelection: false, futureMapEnablement: false },
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    });
    expect(result.summary.structureKinds).toEqual(["boss-room", "npc-camp", "ruin", "safe-zone", "shop"]);
    expect(result.summary.spawnRoles).toEqual(["animal", "boss", "npc", "regular"]);
    expect(result.summary.exportPreview).toMatchObject({ writesPerformed: false, moduleFiles: expect.arrayContaining(["manifest.json", "terrain.json", "blocks.json", "water.json", "structures.json", "spawns.json", "metadata.json"]) });
    expect(result.graph.valid).toBe(true);
  });

  it("keeps output content bounded and changes deterministic world hash with a seed change", () => {
    const first = buildWorldGeneratorCoverageDependencyGraph({ mapId: DEFAULT_GENERATOR_MAP_ID, seed: 9107, radius: 16 });
    const second = buildWorldGeneratorCoverageDependencyGraph({ mapId: DEFAULT_GENERATOR_MAP_ID, seed: 9107, radius: 16 });
    const changed = buildWorldGeneratorCoverageDependencyGraph({ mapId: DEFAULT_GENERATOR_MAP_ID, seed: 9108, radius: 16 });

    expect(first.world.worldHash).toBe(second.world.worldHash);
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.world.worldHash).not.toBe(changed.world.worldHash);
    expect(first.summary.outputCounts.terrainCellCount).toBe((16 * 2 + 1) ** 2);
    expect(first.summary.outputCounts.blockCount).toBeGreaterThan(0);
  });

  it("preserves backend-only and Obsidian-only policy when difficulty changes", () => {
    const peaceful = buildWorldGeneratorCoverageDependencyGraph({ difficulty: "peaceful", radius: 12 });

    expect(peaceful.summary.mapId).toBe(DEFAULT_GENERATOR_MAP_ID);
    expect(peaceful.summary.backendOnly).toBe(true);
    expect(peaceful.summary.owners.playerGeneratorUi).toBe(false);
    expect(peaceful.summary.owners.runtimeMapSelection).toBe(false);
    expect(peaceful.summary.owners.futureMapEnablement).toBe(false);
    expect(peaceful.summary.requiredCoverage.regularSpawn).toBe(false);
    expect(peaceful.summary.requiredCoverage.bossSpawn).toBe(false);
    expect(peaceful.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects future maps, invalid seeds/radii, and unsupported rules instead of broadening generation", () => {
    expect(() => buildWorldGeneratorCoverageDependencyGraph({ mapId: "future-map" })).toThrow(/Only obsidian-frontier/);
    expect(() => buildWorldGeneratorCoverageDependencyGraph({ seed: 1.5 })).toThrow(/seed/);
    expect(() => buildWorldGeneratorCoverageDependencyGraph({ radius: WORLD_GENERATOR_COVERAGE_MIN_RADIUS - 1 })).toThrow(/radius/);
    expect(() => buildWorldGeneratorCoverageDependencyGraph({ radius: WORLD_GENERATOR_COVERAGE_MAX_RADIUS + 1 })).toThrow(/radius/);
    expect(() => buildWorldGeneratorCoverageDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
  });

  it("keeps the export contract as a no-write preview", () => {
    const result = buildWorldGeneratorCoverageDependencyGraph({ radius: 8 });

    expect(result.summary.exportPreview.writesPerformed).toBe(false);
    expect(result.summary.exportPreview.contentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.world.metadata.systems).toEqual(expect.arrayContaining(["terrain", "water", "vegetation", "resources", "caves", "structures", "spawns", "map-export"]));
    expect(result.graph.issues).toEqual([]);
    expect(result.graph.schemaVersion).toBe("a-survival.dependency-graph.v1");
    expect(WORLD_GENERATOR_COVERAGE_GRAPH_RULES_VERSION).toBe("world-generator-coverage-graph-rules.v1");
  });
});
