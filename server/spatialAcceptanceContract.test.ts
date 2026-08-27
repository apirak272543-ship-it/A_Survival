import { describe, expect, it } from "vitest";
import { buildWorldSpatialDependencyGraph } from "./generators/worldSpatialDependencyGraph";
import { validateWorldSpatialAcceptance } from "./spatialAcceptanceContract";

describe("world spatial acceptance contract", () => {
  it("accepts the bounded Obsidian spatial graph artifact", () => {
    const output = buildWorldSpatialDependencyGraph({ seed: 17, radius: 20, placementSubjects: ["terrain", "water", "tree", "structure", "npc", "monster"] });

    expect(validateWorldSpatialAcceptance(output)).toEqual({ valid: true, issues: [] });
    expect(output.summary.runtimeImportAllowed).toBe(false);
    expect(output.summary.playerVisible).toBe(false);
    expect(output.summary.cacheable).toBe(false);
  });

  it("is deterministic for the same seed and bounded subjects", () => {
    const first = buildWorldSpatialDependencyGraph({ seed: 17, radius: 20, placementSubjects: ["terrain", "water", "tree"] });
    const second = buildWorldSpatialDependencyGraph({ seed: 17, radius: 20, placementSubjects: ["terrain", "water", "tree"] });

    expect(validateWorldSpatialAcceptance(first)).toEqual(validateWorldSpatialAcceptance(second));
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
  });

  it("rejects runtime policy violations and inconsistent summary counts", () => {
    const output = buildWorldSpatialDependencyGraph({ seed: 19, radius: 20, placementSubjects: ["terrain"] });
    const invalid = {
      ...output,
      summary: { ...output.summary, runtimeImportAllowed: true, placementSampleCount: 99 },
    };

    const result = validateWorldSpatialAcceptance(invalid);
    const codes = result.issues.map(issue => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("RUNTIME_POLICY_VIOLATION");
    expect(codes).toContain("INVALID_SUMMARY");
  });
});
