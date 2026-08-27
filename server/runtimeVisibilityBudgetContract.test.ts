import { describe, expect, it } from "vitest";
import { evaluateRuntimeVisibilityBudget } from "./runtimeVisibilityBudgetContract";

describe("runtime visibility budget contract", () => {
  it("uses the canonical balanced profile and fixed no-generation runtime policy", () => {
    const result = evaluateRuntimeVisibilityBudget({ tier: "balanced", requestedViewDistanceBlocks: 50, requestedTargetFps: 120, visibleObjectCount: 42, particleCount: 100 });

    expect(result.valid).toBe(true);
    expect(result.tier).toBe("balanced");
    expect(result.budget).toMatchObject({ maxViewDistanceBlocks: 35, viewDistanceBlocks: 35, maxTargetFps: 60, targetFps: 60, lodPolicy: "balanced", shadowQuality: "low" });
    expect(result.runtimePolicy).toEqual({ renderLoopGeneratorCallsAllowed: false, assetGenerationAllowed: false, cacheWriteAllowed: false, sleepOutsideRadius: true, lodPolicy: "balanced", shadowQuality: "low" });
  });

  it("reports particle over-budget without mutating visibility or generating assets", () => {
    const result = evaluateRuntimeVisibilityBudget({ tier: "low", visibleObjectCount: 10, particleCount: 81 });

    expect(result.valid).toBe(false);
    expect(result.observed).toEqual({ visibleObjectCount: 10, particleCount: 81 });
    expect(result.issues).toEqual(["particleCount exceeds low budget: 81 > 80"]);
    expect(result.runtimePolicy.assetGenerationAllowed).toBe(false);
  });

  it("keeps high tier bounded and deterministic for the same input", () => {
    const input = { tier: "high" as const, requestedViewDistanceBlocks: 45, requestedTargetFps: 120, visibleObjectCount: 256, particleCount: 320 };
    const first = evaluateRuntimeVisibilityBudget(input);
    const second = evaluateRuntimeVisibilityBudget(input);

    expect(second).toEqual(first);
    expect(first.valid).toBe(true);
    expect(first.budget).toMatchObject({ viewDistanceBlocks: 45, targetFps: 120, maxParticleCount: 320, lodPolicy: "detailed", shadowQuality: "high" });
  });

  it("rejects malformed observed counts while preserving the canonical budget", () => {
    const result = evaluateRuntimeVisibilityBudget({ tier: "low", visibleObjectCount: -1, particleCount: 1.5 });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "visibleObjectCount must be a non-negative integer",
      "particleCount must be a non-negative integer",
    ]));
    expect(result.budget.maxViewDistanceBlocks).toBe(15);
    expect(result.budget.maxTargetFps).toBe(30);
  });
});
