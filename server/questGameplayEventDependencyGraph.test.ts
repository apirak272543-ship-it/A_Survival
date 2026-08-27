import { describe, expect, it } from "vitest";
import { buildQuestGameplayEventDependencyGraph, getDefaultQuestGameplayEventDependencyGraphInput } from "./generators/questGameplayEventDependencyGraph";

describe("quest gameplay event dependency graph", () => {
  it("maps real map-one quest objectives to the known gameplay action owner deterministically", () => {
    const input = { seed: "quest-event-seed", sampleQuestCount: 8, completedQuestCount: 0 };
    const first = buildQuestGameplayEventDependencyGraph(input);
    const second = buildQuestGameplayEventDependencyGraph(input);

    expect(first).toEqual(second);
    expect(first.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "quest-event-seed", sampleQuestCount: 8, completedQuestCount: 0 });
    expect(first.assessments).toHaveLength(8);
    expect(first.assessments[0]).toMatchObject({ objectiveKind: "visit", targetId: "seed-plant-001", supported: false });
    expect(first.assessments[3]).toMatchObject({ objectiveKind: "harvest", runtimeEventType: "harvest-world-crop", owner: "worldFarmSystem/ArcaneFrontier", supported: false });
    expect(first.assessments[4]).toMatchObject({ objectiveKind: "place-block", runtimeEventType: "block-place", supported: false });
    expect(first.summary).toMatchObject({ mapId: "obsidian-frontier", sampleQuestCount: 8, supportedObjectiveCount: 0, unsupportedObjectiveCount: 8, missingRuntimeEventCount: 5, missingTargetBindingCount: 8, unresolvedReferenceCount: 13, unresolvedReferenceTypes: { "gameplay-event-owner": 5, "gameplay-target-binding": 8, "quest-contract": 0 }, runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.graph.valid).toBe(false);
    expect(first.graph.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "gameplay-event-owner:visit" }),
      expect.objectContaining({ code: "MISSING_REQUIRED_DEPENDENCY", dependencyKey: "gameplay-target-binding:objective-1-1-01" }),
    ]));
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("keeps the current contract honest when later quest completion is previewed", () => {
    const result = buildQuestGameplayEventDependencyGraph({ ...getDefaultQuestGameplayEventDependencyGraphInput("completed-quest-event-seed"), sampleQuestCount: 1, completedQuestCount: 20 });

    expect(result.artifact.completedQuestCount).toBe(20);
    expect(result.assessments[0]).toMatchObject({ questId: "story-map-001-quest-01", objectiveKind: "visit", supported: false });
    expect(result.graph.valid).toBe(false);
    expect(result.summary.unresolvedReferenceCount).toBe(2);
    expect(result.summary.completedQuestCount).toBe(20);
  });

  it("bounds sample, completion and rules inputs", () => {
    expect(() => buildQuestGameplayEventDependencyGraph({ seed: "zero", sampleQuestCount: 0 })).toThrow("sampleQuestCount must be between 1 and 20");
    expect(() => buildQuestGameplayEventDependencyGraph({ seed: "large", sampleQuestCount: 21 })).toThrow("sampleQuestCount must be between 1 and 20");
    expect(() => buildQuestGameplayEventDependencyGraph({ seed: "negative", completedQuestCount: -1 })).toThrow("completedQuestCount must be between 0 and 20");
    expect(() => buildQuestGameplayEventDependencyGraph({ seed: "large", completedQuestCount: 21 })).toThrow("completedQuestCount must be between 0 and 20");
    expect(() => buildQuestGameplayEventDependencyGraph({ seed: "rules", rulesVersion: "wrong.v1" })).toThrow("Unsupported quest gameplay event graph rules version");
  });
});
