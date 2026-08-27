import { describe, expect, it } from "vitest";
import { RUNTIME_MAP_ID } from "../client/src/game/routing/directRoute";
import { buildStoryMapCachePolicyDependencyGraph, getDefaultStoryMapCachePolicyInput } from "./generators/storyMapCachePolicyDependencyGraph";

describe("story map cache policy dependency graph", () => {
  it("connects the active story map to the real registry, route and cache owners deterministically", () => {
    const input = { seed: "story-map-cache-seed", requestedMapIds: [RUNTIME_MAP_ID], completedQuestCount: 0 };
    const first = buildStoryMapCachePolicyDependencyGraph(input);
    const second = buildStoryMapCachePolicyDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.requests).toMatchObject([{ requestedMapId: RUNTIME_MAP_ID, resolvedMapId: RUNTIME_MAP_ID, isRuntimeAllowed: true, selectionAllowed: true, cacheEligible: true, fallsBackToRuntimeMap: false, registryDefinitionAvailable: true }]);
    expect(first.summary).toMatchObject({ runtimeMapId: RUNTIME_MAP_ID, storyPlayableMapId: RUNTIME_MAP_ID, storyContractConsistent: true, requestedCount: 1, selectionAllowedCount: 1, cacheEligibleCount: 1, fallbackCount: 0, registryDefinitionMissingCount: 0, runtimeDeniedCount: 0, unresolvedReferenceCount: 0, unresolvedReferenceTypes: { "map-registry": 0, "selection-boundary": 0, "cache-boundary": 0, "story-contract": 0 }, runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.graph.valid).toBe(true);
    expect(first.graph.issues).toEqual([]);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.nodes.map(node => node.generatorId)).toContain("map.registry");
    expect(first.nodes.map(node => node.generatorId)).toContain("direct.route");
    expect(first.nodes.map(node => node.generatorId)).toContain("map.cache");
  });

  it("keeps a future story map blocked even when direct route safely falls back", () => {
    const result = buildStoryMapCachePolicyDependencyGraph({ ...getDefaultStoryMapCachePolicyInput("future-map-cache-seed"), requestedMapIds: [RUNTIME_MAP_ID, "story-map-002"] });

    expect(result.requests).toMatchObject([
      { requestedMapId: RUNTIME_MAP_ID, resolvedMapId: RUNTIME_MAP_ID, selectionAllowed: true, cacheEligible: true, fallsBackToRuntimeMap: false, registryDefinitionAvailable: true },
      { requestedMapId: "story-map-002", resolvedMapId: RUNTIME_MAP_ID, isRuntimeAllowed: false, selectionAllowed: false, cacheEligible: false, fallsBackToRuntimeMap: true, registryDefinitionAvailable: false },
    ]);
    expect(result.summary).toMatchObject({ requestedCount: 2, selectionAllowedCount: 1, cacheEligibleCount: 1, fallbackCount: 1, registryDefinitionMissingCount: 1, runtimeDeniedCount: 1, unresolvedReferenceTypes: { "map-registry": 1, "selection-boundary": 1, "cache-boundary": 1, "story-contract": 0 } });
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "map-registry:story-map-002" }),
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "runtime-map-approval:story-map-002" }),
    ]));
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("bounds malformed request inputs without preparing or caching map modules", () => {
    expect(() => buildStoryMapCachePolicyDependencyGraph({ seed: "bounded", requestedMapIds: ["a", "b", "c", "d"] })).toThrow("requestedMapIds must contain at most 3 map IDs");
    expect(() => buildStoryMapCachePolicyDependencyGraph({ seed: "duplicate", requestedMapIds: [RUNTIME_MAP_ID, RUNTIME_MAP_ID] })).toThrow("requestedMapIds must not contain duplicates");
    expect(() => buildStoryMapCachePolicyDependencyGraph({ seed: "rules", rulesVersion: "wrong.v1" })).toThrow("Unsupported story map cache policy graph rules version");
  });
});
