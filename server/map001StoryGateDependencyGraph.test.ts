import { describe, expect, it } from "vitest";
import { buildMap001StoryGateDependencyGraph } from "./generators/map001StoryGateDependencyGraph";

const input = { seed: "map001-story-gate-seed", mapCount: 2 };

describe("MAP_001 story gate dependency graph", () => {
  it("connects real MAP_001 encounter outputs to the generated 20-quest map gate deterministically", () => {
    const first = buildMap001StoryGateDependencyGraph(input);
    const second = buildMap001StoryGateDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: input.seed, mapCount: 2, questCount: 40, playableMapIndex: 1, nextMapIndex: 2, nextMapRuntimeImportAllowed: false, questGeneratorVersion: "1.0.0", encounterOwnerVersion: "1.0.0" });
    expect(first.summary).toMatchObject({ mapId: "obsidian-frontier", playableMapIndex: 1, playableMapQuestCount: 20, nextMapIndex: 2, nextMapId: "story-map-002", nextMapPrerequisiteCount: 20, encounterEventCount: 2, encounterCompletionSupported: false, gateReady: false, futureMapRuntimeImportAllowed: false });
    expect(first.gate.requiredQuestIds).toHaveLength(20);
    expect(first.gate.requiredQuestIds[0]).toBe("story-map-001-quest-01");
    expect(first.gate.requiredQuestIds[19]).toBe("story-map-001-quest-20");
    expect(first.gate.encounterEventIds).toEqual(["map001-encounter-output:distress-pod-glass-stalkers", "map001-encounter-output:leyline-monolith-void-reaper"]);
    expect(first.gate.completionState).toBe("not-represented");
    expect(first.storyMaps).toEqual(expect.arrayContaining([
      expect.objectContaining({ mapIndex: 1, mapId: "obsidian-frontier", runtimeStatus: "playable", runtimeImportAllowed: true, questIds: expect.arrayContaining(["story-map-001-quest-20"]) }),
      expect.objectContaining({ mapIndex: 2, mapId: "story-map-002", runtimeStatus: "planned", runtimeImportAllowed: false, unlockRequiresQuestIds: first.gate.requiredQuestIds }),
    ]));
    expect(first.unresolvedReferences.some(reference => reference.referenceType === "encounter-completion")).toBe(true);
    expect(first.summary.unresolvedReferenceTypes["encounter-completion"]).toBe(1);
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY" && issue.dependencyKey === "map001-encounter-completion:boss-defeated")).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps future-map runtime boundary blocked and rejects an underspecified gate preview", () => {
    const result = buildMap001StoryGateDependencyGraph({ ...input, mapCount: 3 });

    expect(result.storyMaps[1]).toMatchObject({ mapIndex: 2, runtimeStatus: "planned", runtimeImportAllowed: false });
    expect(result.storyMaps[2]).toMatchObject({ mapIndex: 3, runtimeStatus: "planned", runtimeImportAllowed: false });
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "encounter-completion")).toBe(true);
    expect(result.unresolvedReferences.some(reference => reference.referenceType === "runtime-map-boundary")).toBe(false);
    expect(() => buildMap001StoryGateDependencyGraph({ ...input, mapCount: 1 })).toThrow("mapCount must be an integer from 2 to 3");
  });

  it("rejects unsupported rules", () => {
    expect(() => buildMap001StoryGateDependencyGraph({ ...input, rulesVersion: "wrong.v1" })).toThrow("Unsupported MAP_001 story gate graph rules version");
  });
});
