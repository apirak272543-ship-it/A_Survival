import { describe, expect, it } from "vitest";
import { buildStoryProgressionContractDependencyGraph } from "./generators/storyProgressionContractDependencyGraph";

const input = { seed: "story-runtime-contract-seed", completedQuestCount: 0 };

describe("story progression contract dependency graph", () => {
  it("connects the runtime state to the real quest progression artifact deterministically", () => {
    const first = buildStoryProgressionContractDependencyGraph(input);
    const second = buildStoryProgressionContractDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: input.seed, questGeneratorVersion: "1.0.0", runtimeStoryVersion: "1.0.0", completedQuestCount: 0, questCount: 40 });
    expect(first.runtimeState).toEqual({ completedQuestIds: [], completedMapIndex: 0, nextMapReadyIndex: null });
    expect(first.runtimeSummary).toMatchObject({ playableMapId: "obsidian-frontier", completedQuestCount: 0, questsPerPlayableMap: 20, currentQuestId: "story-map-001-quest-01", completedMapIndex: 0, nextMapReadyIndex: null, futureMapsRuntimeImportAllowed: false });
    expect(first.generated.currentQuestId).toBe("story-map-001-quest-01");
    expect(first.summary).toMatchObject({ mapId: "obsidian-frontier", completedQuestCount: 0, questsPerPlayableMap: 20, currentQuestMatch: true, completedQuestPrefixMatch: true, playableMapContractMatch: true, nextMapReadyIndex: null, nextMapRuntimeImportAllowed: false, futureMapsRuntimeImportAllowed: false, unresolvedReferenceCount: 0, unresolvedReferenceTypes: { "runtime-state": 0, "quest-contract": 0, "runtime-map-boundary": 0 } });
    expect(first.graph.valid).toBe(true);
    expect(first.graph.issues).toEqual([]);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("maps a completed playable chapter to the next planned map without enabling runtime import", () => {
    const result = buildStoryProgressionContractDependencyGraph({ ...input, completedQuestCount: 20 });

    expect(result.runtimeState.completedQuestIds).toHaveLength(20);
    expect(result.runtimeState.completedMapIndex).toBe(1);
    expect(result.runtimeState.nextMapReadyIndex).toBe(2);
    expect(result.runtimeSummary.currentQuestId).toBeNull();
    expect(result.generated.nextMap).toMatchObject({ mapIndex: 2, mapId: "story-map-002", runtimeStatus: "planned", runtimeImportAllowed: false });
    expect(result.summary).toMatchObject({ completedQuestCount: 20, currentQuestMatch: true, completedQuestPrefixMatch: true, playableMapContractMatch: true, nextMapReadyIndex: 2, nextMapRuntimeImportAllowed: false, futureMapsRuntimeImportAllowed: false, unresolvedReferenceCount: 0 });
    expect(result.graph.valid).toBe(true);
  });

  it("rejects unsupported rules and out-of-bounds runtime progress", () => {
    expect(() => buildStoryProgressionContractDependencyGraph({ ...input, completedQuestCount: -1 })).toThrow("completedQuestCount must be an integer from 0 to 20");
    expect(() => buildStoryProgressionContractDependencyGraph({ ...input, completedQuestCount: 21 })).toThrow("completedQuestCount must be an integer from 0 to 20");
    expect(() => buildStoryProgressionContractDependencyGraph({ ...input, rulesVersion: "wrong.v1" })).toThrow("Unsupported story progression contract graph rules version");
  });
});
