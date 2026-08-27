import { describe, expect, it } from "vitest";
import { RUNTIME_MAP_ID } from "../client/src/game/routing/directRoute";
import { buildStoryOfflineMapStateDependencyGraph, getDefaultStoryOfflineMapStateDependencyGraphInput } from "./generators/storyOfflineMapStateDependencyGraph";

describe("story offline map state dependency graph", () => {
  it("connects the active map to its player namespace deterministically without writing state", () => {
    const input = { seed: "offline-state-seed", playerId: "player-a", requestedMapIds: [RUNTIME_MAP_ID], completedQuestCount: 0 };
    const first = buildStoryOfflineMapStateDependencyGraph(input);
    const second = buildStoryOfflineMapStateDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.assessments).toMatchObject([{ requestedMapId: RUNTIME_MAP_ID, resolvedMapId: RUNTIME_MAP_ID, playerId: "player-a", registryDefinitionAvailable: true, selectionAllowed: true, cacheEligible: true, offlineStateNamespaceAllowed: true, normalizationPreservesIdentity: true, futureMapWriteBlocked: false }]);
    expect(first.assessments[0]?.persistedStateKeys).toEqual(["cameraMode", "fogOfWar", "harvestedNodes", "inMapSettings", "mapId", "playerId", "updatedAt", "worldBlockOverrides", "worldFarmState", "worldPlants", "worldStorageById"]);
    expect(first.summary).toMatchObject({ requestedCount: 1, selectableCount: 1, cacheEligibleCount: 1, offlineStateNamespaceAllowedCount: 1, futureMapWriteBlockedCount: 0, registryDefinitionMissingCount: 0, runtimeDeniedCount: 0, unresolvedReferenceCount: 0, unresolvedReferenceTypes: { "map-registry": 0, "selection-boundary": 0, "cache-boundary": 0, "offline-state-boundary": 0, "story-contract": 0 }, runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.graph.valid).toBe(true);
    expect(first.graph.issues).toEqual([]);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.nodes.map(node => node.generatorId)).toContain("offline.map-state");
  });

  it("keeps future maps data-only and blocks offline state writes even when route fallback is safe", () => {
    const result = buildStoryOfflineMapStateDependencyGraph({ ...getDefaultStoryOfflineMapStateDependencyGraphInput("future-offline-state-seed"), requestedMapIds: [RUNTIME_MAP_ID, "story-map-002"] });

    expect(result.assessments).toMatchObject([
      { requestedMapId: RUNTIME_MAP_ID, resolvedMapId: RUNTIME_MAP_ID, offlineStateNamespaceAllowed: true, futureMapWriteBlocked: false },
      { requestedMapId: "story-map-002", resolvedMapId: RUNTIME_MAP_ID, registryDefinitionAvailable: false, selectionAllowed: false, cacheEligible: false, offlineStateNamespaceAllowed: false, normalizationPreservesIdentity: true, futureMapWriteBlocked: true },
    ]);
    expect(result.summary).toMatchObject({ requestedCount: 2, selectableCount: 1, cacheEligibleCount: 1, offlineStateNamespaceAllowedCount: 1, futureMapWriteBlockedCount: 1, registryDefinitionMissingCount: 1, runtimeDeniedCount: 1, unresolvedReferenceTypes: { "map-registry": 1, "selection-boundary": 1, "cache-boundary": 1, "offline-state-boundary": 1, "story-contract": 0 } });
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "offline-state-runtime-approval:story-map-002" }),
    ]));
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("bounds preview requests and player IDs", () => {
    expect(() => buildStoryOfflineMapStateDependencyGraph({ seed: "bounded", requestedMapIds: ["a", "b", "c", "d"] })).toThrow("requestedMapIds must contain at most 3 map IDs");
    expect(() => buildStoryOfflineMapStateDependencyGraph({ seed: "duplicate", requestedMapIds: [RUNTIME_MAP_ID, RUNTIME_MAP_ID] })).toThrow("requestedMapIds must not contain duplicates");
    expect(() => buildStoryOfflineMapStateDependencyGraph({ seed: "player", playerId: "x".repeat(65) })).toThrow("playerId must contain at most 64 characters");
    expect(() => buildStoryOfflineMapStateDependencyGraph({ seed: "rules", rulesVersion: "wrong.v1" })).toThrow("Unsupported story offline map state graph rules version");
  });
});
