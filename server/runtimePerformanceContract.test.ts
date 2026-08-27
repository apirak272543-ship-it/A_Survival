import { describe, expect, it } from "vitest";
import {
  buildRuntimePerformanceContract,
  RUNTIME_PERFORMANCE_CONTRACT_VERSION,
} from "../client/src/game/systems/runtimePerformanceContract";

describe("runtime performance contract", () => {
  it("derives one low-tier budget for visibility, telemetry, and profiler", () => {
    const contract = buildRuntimePerformanceContract("low", 50, 120);

    expect(contract).toMatchObject({
      contractVersion: RUNTIME_PERFORMANCE_CONTRACT_VERSION,
      tier: "low",
      visibility: { viewDistanceBlocks: 15, safetyPaddingBlocks: 0 },
      telemetry: { tier: "low", effectiveTargetFps: 30 },
      profiler: { tier: "low", effectiveTargetFps: 30, viewDistanceBlocks: 15 },
    });
    expect(contract.visibility.viewDistanceBlocks).toBe(contract.budget.viewDistanceBlocks);
    expect(contract.telemetry.effectiveTargetFps).toBe(contract.budget.targetFps);
    expect(contract.profiler.effectiveTargetFps).toBe(contract.budget.targetFps);
    expect(contract.profiler.viewDistanceBlocks).toBe(contract.budget.viewDistanceBlocks);
  });

  it("keeps the selected high-tier budget bounded by the canonical profile", () => {
    const contract = buildRuntimePerformanceContract("high", 20, 60);

    expect(contract.tier).toBe("high");
    expect(contract.budget.maxViewDistanceBlocks).toBe(50);
    expect(contract.budget.maxTargetFps).toBe(120);
    expect(contract.visibility.viewDistanceBlocks).toBe(20);
    expect(contract.telemetry.effectiveTargetFps).toBe(60);
    expect(contract.profiler).toMatchObject({ tier: "high", effectiveTargetFps: 60, viewDistanceBlocks: 20 });
  });

  it("normalizes malformed input deterministically without mutating the caller values", () => {
    const requested = { tier: "not-a-tier", viewDistance: "invalid", targetFps: Number.NaN };
    const before = JSON.stringify(requested);
    const first = buildRuntimePerformanceContract(requested.tier, requested.viewDistance, requested.targetFps);
    const second = buildRuntimePerformanceContract(requested.tier, requested.viewDistance, requested.targetFps);

    expect(JSON.stringify(requested)).toBe(before);
    expect(first).toEqual(second);
    expect(first).toMatchObject({ tier: "balanced", visibility: { viewDistanceBlocks: 35 }, telemetry: { effectiveTargetFps: 60 } });
  });

  it("keeps the adapter read-only and does not introduce a second visibility radius", () => {
    const contract = buildRuntimePerformanceContract("balanced", 35, 60);

    expect(Object.isFrozen(contract)).toBe(true);
    expect(Object.isFrozen(contract.budget)).toBe(true);
    expect(Object.isFrozen(contract.visibility)).toBe(true);
    expect(Object.isFrozen(contract.telemetry)).toBe(true);
    expect(Object.isFrozen(contract.profiler)).toBe(true);
    expect(contract.visibility.safetyPaddingBlocks).toBe(0);
    expect(contract.claims).toEqual({
      deviceBenchmark: false,
      adaptiveTiering: false,
      playerRuntimeMutation: false,
      networkPersistence: false,
    });
  });
});
