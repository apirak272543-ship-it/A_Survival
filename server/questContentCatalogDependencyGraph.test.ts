import { describe, expect, it } from "vitest";
import { buildQuestContentCatalogDependencyGraph } from "./generators/questContentCatalogDependencyGraph";

describe("quest content catalog dependency graph", () => {
  it("derives quest/map/content references from real quest and catalog artifacts", () => {
    const first = buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", mapCount: 3, sampleQuestCount: 8 });
    const second = buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", mapCount: 3, sampleQuestCount: 8 });

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ generatorId: "quest.progression", generatorVersion: "1.0.0", seed: "quest-catalog-seed", mapCount: 3, questCount: 60 });
    expect(first.summary.sampledQuestCount).toBe(8);
    expect(first.summary.futureMapNodeCount).toBe(2);
    expect(first.summary.referencedContentCount).toBeGreaterThan(0);
    expect(first.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "content:terrain.obsidian")).toBe(true);
    expect(first.nodes.some(node => node.key === "map:obsidian-frontier")).toBe(true);
    expect(first.nodes.some(node => node.key === "map:story-map-002")).toBe(true);
    expect(first.nodes.some(node => node.key === "map:story-map-003")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps rules, map and sample bounds explicit", () => {
    expect(() => buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", rulesVersion: "quest-content-graph-rules.v2" })).toThrow("Unsupported quest content graph rules version");
    expect(() => buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", mapCount: 0 })).toThrow("mapCount");
    expect(() => buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", mapCount: 101 })).toThrow("mapCount");
    expect(() => buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", sampleQuestCount: 0 })).toThrow("sampleQuestCount");
    expect(() => buildQuestContentCatalogDependencyGraph({ seed: "quest-catalog-seed", sampleQuestCount: 21 })).toThrow("sampleQuestCount");
  });
});
