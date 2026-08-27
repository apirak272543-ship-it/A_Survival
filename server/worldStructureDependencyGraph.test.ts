import { describe, expect, it } from "vitest";
import { buildWorldStructureDependencyGraph } from "./generators/worldStructureDependencyGraph";

describe("world structure dependency graph", () => {
  it("derives a deterministic graph from the real Obsidian world and structure generators", () => {
    const first = buildWorldStructureDependencyGraph({ seed: "world-structure-seed", radius: 32, blueprintIds: ["object-frontier-lantern"] });
    const second = buildWorldStructureDependencyGraph({ seed: "world-structure-seed", radius: 32, blueprintIds: ["object-frontier-lantern"] });

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", structureGeneratorVersion: "1.0.0", blueprintCount: 1 });
    expect(first.artifact.worldHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.artifact.structureHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.summary.worldBlocks).toBeGreaterThan(0);
    expect(first.summary.terrainCells).toBe(4225);
    expect(first.summary.blueprintIds).toEqual(["object-frontier-lantern"]);
    expect(first.summary.futureMapCount).toBe(0);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.nodes.some(node => node.key.startsWith("world:obsidian-frontier:"))).toBe(true);
    expect(first.graph.nodes.some(node => node.key === "structure-blueprint:object-frontier-lantern")).toBe(true);
    expect(first.graph.nodes.some(node => node.key.startsWith("structure-run:"))).toBe(true);
    expect(first.graph.nodes.some(node => node.key.startsWith("structure-placement:"))).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects unsupported rules, out-of-scope radius and unknown blueprints", () => {
    expect(() => buildWorldStructureDependencyGraph({ seed: "world-structure-seed", rulesVersion: "world-structure-graph-rules.v2" })).toThrow("Unsupported world structure graph rules version");
    expect(() => buildWorldStructureDependencyGraph({ seed: "world-structure-seed", radius: 15 })).toThrow("radius");
    expect(() => buildWorldStructureDependencyGraph({ seed: "world-structure-seed", radius: 65 })).toThrow("radius");
    expect(() => buildWorldStructureDependencyGraph({ seed: "world-structure-seed", blueprintIds: ["unknown-blueprint"] })).toThrow("Unknown structure blueprint");
  });
});
