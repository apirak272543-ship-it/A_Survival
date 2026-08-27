import { describe, expect, it } from "vitest";
import {
  STRUCTURE_BLUEPRINT_LIBRARY,
  createStructureGeneratorRegistry,
  evaluateStructurePlacement,
  generateStructurePlacements,
  validateStructureBlueprints,
  validateStructureGenerationOutput,
  type StructureBlueprint,
  type StructurePlacementCandidate,
  type StructureWorldContext,
} from "./generators/structureGenerator";

function context(overrides: Partial<StructureWorldContext> = {}): StructureWorldContext {
  return {
    mapId: "obsidian-frontier",
    biome: "Obsidian Alien Frontier",
    terrain: "flat",
    climate: "temperate",
    slopeDegrees: 4,
    waterDepth: 0,
    groundY: 0,
    freeSpaceWidth: 160,
    freeSpaceLength: 160,
    roadDistance: 5,
    settlementDistance: 20,
    population: 27,
    supportRatio: 1,
    accessibleEntry: true,
    worldBounds: { minX: -256, maxX: 256, minZ: -256, maxZ: 256 },
    occupiedFootprints: [],
    ...overrides,
  };
}

function candidate(overrides: Partial<StructurePlacementCandidate> = {}): StructurePlacementCandidate {
  return { x: 4, y: 5, z: 7, context: context(), ...overrides };
}

describe("Structure Generator", () => {
  it("validates a reusable five-level blueprint library", () => {
    expect(validateStructureBlueprints(STRUCTURE_BLUEPRINT_LIBRARY)).toEqual({ valid: true, issues: [] });
    expect(new Set(STRUCTURE_BLUEPRINT_LIBRARY.map(blueprint => blueprint.level))).toEqual(new Set(["object", "building", "compound", "settlement", "landmark"]));
  });

  it("accepts a valid clock tower location and repairs its ground height", () => {
    const clockTower = STRUCTURE_BLUEPRINT_LIBRARY.find(blueprint => blueprint.id === "building-magic-clock-tower")!;
    const result = evaluateStructurePlacement(clockTower, candidate({ y: 42 }));

    expect(result.accepted).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(95);
    expect(result.repairs).toContain("y aligned to ground surface");
    expect(result.reasons).toEqual([]);
  });

  it("rejects water, steep slope, missing road and insufficient settlement conditions", () => {
    const clockTower = STRUCTURE_BLUEPRINT_LIBRARY.find(blueprint => blueprint.id === "building-magic-clock-tower")!;
    const result = evaluateStructurePlacement(clockTower, candidate({
      context: context({ slopeDegrees: 40, waterDepth: 2, roadDistance: 50, settlementDistance: 200, population: 3, freeSpaceWidth: 10, freeSpaceLength: 10, accessibleEntry: false }),
    }));

    expect(result.accepted).toBe(false);
    expect(result.reasons).toEqual(expect.arrayContaining([
      "slope exceeds blueprint limit",
      "water is forbidden",
      "free space is insufficient",
      "road access is too far",
      "settlement is too far",
      "no accessible entry",
    ]));
    const lowPopulation = evaluateStructurePlacement(clockTower, candidate({ context: context({ settlementDistance: 20, population: 3 }) }));
    expect(lowPopulation.reasons).toContain("settlement population is too low");
  });

  it("rejects a footprint that cannot fit inside the world bounds", () => {
    const tower = STRUCTURE_BLUEPRINT_LIBRARY.find(blueprint => blueprint.id === "building-magic-clock-tower")!;
    const result = evaluateStructurePlacement(tower, candidate({ context: context({ worldBounds: { minX: 0, maxX: 10, minZ: 0, maxZ: 10 } }) }));

    expect(result.accepted).toBe(false);
    expect(result.reasons).toContain("footprint exceeds world bounds");
  });

  it("clamps a candidate into bounds without mutating the original input", () => {
    const lantern = STRUCTURE_BLUEPRINT_LIBRARY.find(blueprint => blueprint.id === "object-frontier-lantern")!;
    const original = candidate({ x: -999, y: 10, z: 999 });
    const result = evaluateStructurePlacement(lantern, original);

    expect(result.accepted).toBe(true);
    expect(result.repairs).toEqual(expect.arrayContaining(["x clamped to world bounds", "z clamped to world bounds", "y aligned to ground surface"]));
    expect(original).toMatchObject({ x: -999, y: 10, z: 999 });
  });

  it("generates deterministic placements through the common registry", () => {
    const blueprint = STRUCTURE_BLUEPRINT_LIBRARY.find(item => item.id === "object-frontier-lantern")!;
    const input = { mapId: "obsidian-frontier", blueprints: [blueprint], candidates: [candidate({ x: 20, y: 0, z: 20 })], minPlacementScore: 80, maxPlacements: 1 };
    const registry = createStructureGeneratorRegistry();
    const first = registry.generate("structure.placement", input, { seed: "frontier-seed", generatedAt: 100 });
    const second = registry.generate("structure.placement", input, { seed: "frontier-seed", generatedAt: 200 });

    expect(second.output).toEqual(first.output);
    expect(second.contentHash).toBe(first.contentHash);
    expect(first.output.placements).toHaveLength(1);
    expect(first.output.rejected).toEqual([]);
    expect(registry.validate(first)).toEqual({ valid: true, issues: [] });
    expect(JSON.parse(registry.export(first))).toMatchObject({ generatorId: "structure.placement", kind: "structure" });
  });

  it("rejects output that references an unknown blueprint or exceeds the run limit", () => {
    const blueprint = STRUCTURE_BLUEPRINT_LIBRARY.find(item => item.id === "object-frontier-lantern")!;
    const input = { mapId: "obsidian-frontier", blueprints: [blueprint], candidates: [candidate()], minPlacementScore: 0, maxPlacements: 1 };
    const output = generateStructurePlacements(input, "validator-seed");
    const tampered = {
      ...output,
      placements: [...output.placements, ...output.placements].map((placement, index) => ({ ...placement, instanceId: `${placement.instanceId}-${index}`, blueprintId: index === 1 ? "missing-blueprint" : placement.blueprintId })),
    };

    expect(validateStructureGenerationOutput(tampered, input).issues).toEqual(expect.arrayContaining(["generated placement count exceeds input maxPlacements", "unknown generated blueprint: missing-blueprint"]));
  });

  it("rejects an occupied location instead of overlapping generated structure space", () => {
    const lantern = STRUCTURE_BLUEPRINT_LIBRARY.find(item => item.id === "object-frontier-lantern")!;
    const occupied = context({ occupiedFootprints: [{ x: 4, z: 7, width: 1, length: 1 }] });
    const input = { mapId: "obsidian-frontier", blueprints: [lantern], candidates: [candidate({ context: occupied })], minPlacementScore: 0, maxPlacements: 1 };
    const output = generateStructurePlacements(input, "overlap-seed");

    expect(output.placements).toEqual([]);
    expect(output.rejected[0]?.reasons).toContain("placement overlaps an occupied footprint");
  });

  it("uses a valid fallback candidate when the highest-scoring candidate overlaps", () => {
    const lantern = STRUCTURE_BLUEPRINT_LIBRARY.find(item => item.id === "object-frontier-lantern")!;
    const input = {
      mapId: "obsidian-frontier",
      blueprints: [lantern],
      candidates: [
        candidate({ context: context({ occupiedFootprints: [{ x: 4, z: 7, width: 1, length: 1 }] }) }),
        candidate({ x: 20, z: 20 }),
      ],
      minPlacementScore: 0,
      maxPlacements: 1,
    };
    const output = generateStructurePlacements(input, "fallback-seed");

    expect(output.placements).toHaveLength(1);
    expect(output.placements[0]).toMatchObject({ x: 20, z: 20 });
  });

  it("keeps invalid blueprints out of a generation run", () => {
    const invalid: StructureBlueprint = { ...STRUCTURE_BLUEPRINT_LIBRARY[0]!, id: "Bad Blueprint" };
    expect(() => generateStructurePlacements({ mapId: "obsidian-frontier", blueprints: [invalid], candidates: [candidate()], minPlacementScore: 80, maxPlacements: 1 }, "invalid-seed")).toThrow("Structure generation input is invalid");
  });
});
