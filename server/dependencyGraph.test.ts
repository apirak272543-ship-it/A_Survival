import { describe, expect, it } from "vitest";
import { validateGeneratorDependencyGraph, type DependencyGraphNode } from "./generators/dependencyGraph";

const hashes = {
  world: "a".repeat(64),
  biome: "b".repeat(64),
  item: "c".repeat(64),
};

function node(overrides: Partial<DependencyGraphNode> & Pick<DependencyGraphNode, "key" | "kind">): DependencyGraphNode {
  return {
    key: overrides.key,
    kind: overrides.kind,
    generatorId: overrides.generatorId ?? `${overrides.kind}.generator`,
    generatorVersion: overrides.generatorVersion ?? "1.0.0",
    schemaVersion: overrides.schemaVersion ?? `a-survival.${overrides.kind}.v1`,
    seed: overrides.seed ?? "master-spec-seed",
    rulesVersion: overrides.rulesVersion ?? "rules.v1",
    contentHash: overrides.contentHash ?? hashes[overrides.kind as keyof typeof hashes] ?? "d".repeat(64),
    dependencies: overrides.dependencies ?? [],
  };
}

describe("generator dependency graph", () => {
  it("sorts nodes and returns dependencies before dependents deterministically", () => {
    const result = validateGeneratorDependencyGraph([
      node({ key: "item.sword", kind: "item", dependencies: [{ key: "biome.obsidian", kind: "biome", required: true, generatorId: "biome.generator", generatorVersion: "1.0.0", contentHash: hashes.biome }] }),
      node({ key: "biome.obsidian", kind: "biome", contentHash: hashes.biome, dependencies: [{ key: "world.obsidian", kind: "world", required: true, generatorId: "world.generator", generatorVersion: "1.0.0", contentHash: hashes.world }] }),
      node({ key: "world.obsidian", kind: "world", contentHash: hashes.world }),
    ]);

    expect(result.valid).toBe(true);
    expect(result.nodes.map(item => item.key)).toEqual(["biome.obsidian", "item.sword", "world.obsidian"]);
    expect(result.topologicalOrder).toEqual(["world.obsidian", "biome.obsidian", "item.sword"]);
    expect(result.edges).toEqual([{ from: "biome.obsidian", to: "item.sword", required: true }, { from: "world.obsidian", to: "biome.obsidian", required: true }]);
    expect(result.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects missing required references but keeps missing optional references non-blocking", () => {
    const result = validateGeneratorDependencyGraph([node({
      key: "quest.frontier",
      kind: "quest",
      dependencies: [
        { key: "npc.missing", kind: "mob", required: true },
        { key: "audio.future", kind: "audio", required: false },
      ],
    })]);

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "npc.missing" })]);
    expect(result.edges).toEqual([]);
  });

  it("rejects kind, generator, compatible-version and content-hash mismatches", () => {
    const result = validateGeneratorDependencyGraph([
      node({ key: "material.obsidian", kind: "item", generatorId: "item.generator", generatorVersion: "2.0.0", contentHash: hashes.item }),
      node({
        key: "weapon.obsidian", kind: "item", dependencies: [{
          key: "material.obsidian",
          kind: "world",
          required: true,
          generatorId: "material.generator",
          compatibleVersions: ["1.0.0"],
          contentHash: "e".repeat(64),
        }],
      }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.map(issue => issue.code)).toEqual(["DEPENDENCY_KIND_MISMATCH", "DEPENDENCY_GENERATOR_MISMATCH", "DEPENDENCY_VERSION_INCOMPATIBLE", "DEPENDENCY_HASH_MISMATCH"]);
  });

  it("rejects duplicate nodes/dependencies and cycles", () => {
    const result = validateGeneratorDependencyGraph([
      node({ key: "node.a", kind: "item", dependencies: [{ key: "node.b", kind: "item", required: true }, { key: "node.b", kind: "item", required: true }] }),
      node({ key: "node.a", kind: "item", dependencies: [{ key: "node.b", kind: "item", required: true }] }),
      node({ key: "node.b", kind: "item", dependencies: [{ key: "node.a", kind: "item", required: true }] }),
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["DUPLICATE_NODE", "DUPLICATE_DEPENDENCY", "CYCLE"]));
    expect(result.topologicalOrder).toEqual([]);
  });
});
