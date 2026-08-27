import { describe, expect, it } from "vitest";
import { getPerformanceBudget, getPerformanceBudgetLabel, normalizePerformanceTier, PERFORMANCE_BUDGETS, PERFORMANCE_TIERS } from "../client/src/game/systems/performanceProfile";

describe("runtime performance profiles", () => {
  it("keeps three explicit data-driven tiers", () => {
    expect(PERFORMANCE_TIERS).toEqual(["low", "balanced", "high"]);
    expect(PERFORMANCE_BUDGETS.low.lodPolicy).toBe("aggressive");
    expect(PERFORMANCE_BUDGETS.balanced.physicsRadiusMeters).toBe(32);
    expect(PERFORMANCE_BUDGETS.high.maxViewDistanceBlocks).toBe(50);
  });

  it("clamps requested view and FPS to the selected tier", () => {
    expect(getPerformanceBudget("low", 50, 120)).toMatchObject({ tier: "low", viewDistanceBlocks: 15, targetFps: 30, shadowQuality: "off" });
    expect(getPerformanceBudget("balanced", 50, 120)).toMatchObject({ tier: "balanced", viewDistanceBlocks: 35, targetFps: 60 });
    expect(getPerformanceBudget("high", 50, 120)).toMatchObject({ tier: "high", viewDistanceBlocks: 50, targetFps: 120 });
  });

  it("normalizes malformed persisted values without opening a new tier", () => {
    expect(normalizePerformanceTier(undefined)).toBe("balanced");
    expect(normalizePerformanceTier("ultra")).toBe("balanced");
    expect(getPerformanceBudget("unknown", "bad", "bad")).toMatchObject({ tier: "balanced", viewDistanceBlocks: 35, targetFps: 60 });
    expect(getPerformanceBudgetLabel("low")).toBe("ประหยัดอุปกรณ์");
    expect(getPerformanceBudgetLabel("high")).toBe("คุณภาพสูง");
  });

  it("keeps all radius budgets below the 500m playable world radius", () => {
    for (const profile of Object.values(PERFORMANCE_BUDGETS)) {
      expect(profile.mobSimulationRadiusMeters).toBeLessThan(500);
      expect(profile.animationRadiusMeters).toBeLessThan(500);
      expect(profile.physicsRadiusMeters).toBeLessThan(500);
    }
  });
});
