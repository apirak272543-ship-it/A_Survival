import { describe, expect, it } from "vitest";
import { buildContentCatalogDependencyGraph } from "./generators/contentCatalogDependencyGraph";

const catalogInput = {
  categories: ["material", "tool", "structure"] as const,
  countPerCategory: 300,
  assetNamespace: "a-survival.test",
};

describe("content catalog dependency graph", () => {
  it("derives a valid graph from deterministic catalog output", () => {
    const first = buildContentCatalogDependencyGraph({ seed: "catalog-seed", samplePerCategory: 2 }, catalogInput);
    const second = buildContentCatalogDependencyGraph({ seed: "catalog-seed", samplePerCategory: 2 }, catalogInput);

    expect(first.artifact).toEqual(second.artifact);
    expect(first.graph).toEqual(second.graph);
    expect(first.graph.valid).toBe(true);
    expect(first.artifact.definitionCount).toBe(900);
    expect(first.artifact.categoryCount).toBe(3);
    expect(first.graph.nodes).toHaveLength(1 + 3 + 6);
    expect(first.graph.nodes.find(node => node.key.startsWith("content-catalog:"))?.dependencies).toHaveLength(3);
    expect(first.graph.nodes.filter(node => node.key.startsWith("content:"))).toHaveLength(6);
    expect(first.graph.nodes.some(node => node.kind === "structure")).toBe(true);
    expect(first.graph.topologicalOrder.findIndex(key => key.startsWith("asset:"))).toBeLessThan(first.graph.topologicalOrder.findIndex(key => key.startsWith("content-catalog:")));
    expect(first.graph.topologicalOrder.findIndex(key => key.startsWith("content-catalog:"))).toBeLessThan(first.graph.topologicalOrder.findIndex(key => key.startsWith("content:")));
  });

  it("rejects unsupported rules and unbounded sample sizes before generation", () => {
    expect(() => buildContentCatalogDependencyGraph({ seed: "catalog-seed", rulesVersion: "rules.v2" }, catalogInput)).toThrow("Unsupported content catalog rules version");
    expect(() => buildContentCatalogDependencyGraph({ seed: "catalog-seed", samplePerCategory: 0 }, catalogInput)).toThrow("samplePerCategory");
    expect(() => buildContentCatalogDependencyGraph({ seed: "catalog-seed", samplePerCategory: 9 }, catalogInput)).toThrow("samplePerCategory");
  });
});
