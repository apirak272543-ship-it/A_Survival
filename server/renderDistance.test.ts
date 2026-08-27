import { describe, expect, it } from "vitest";
import { getBlockRenderDistanceConfig, getRenderDistanceConfig, normalizeTargetFps, normalizeViewDistanceBlocks, RENDER_DISTANCE_PRESETS, TARGET_FPS_OPTIONS, VIEW_DISTANCE_BLOCK_STEPS } from "../client/src/game/systems/renderDistance";

describe("render distance presets", () => {
  it("provides a conservative near preset for battery-constrained phones", () => {
    expect(RENDER_DISTANCE_PRESETS.near.visibleRadiusMeters).toBe(64);
    expect(RENDER_DISTANCE_PRESETS.near.prefetchRadiusMeters).toBe(96);
  });

  it("keeps balanced aligned with the Obsidian 96m/128m target", () => {
    expect(RENDER_DISTANCE_PRESETS.balanced.visibleRadiusMeters).toBe(96);
    expect(RENDER_DISTANCE_PRESETS.balanced.prefetchRadiusMeters).toBe(128);
  });

  it("allows a far preset without exceeding the 500m map radius", () => {
    expect(RENDER_DISTANCE_PRESETS.far.visibleRadiusMeters).toBe(128);
    expect(RENDER_DISTANCE_PRESETS.far.prefetchRadiusMeters).toBe(160);
    expect(RENDER_DISTANCE_PRESETS.far.prefetchRadiusMeters).toBeLessThan(500);
  });

  it("falls back to balanced for missing or invalid persisted values", () => {
    expect(getRenderDistanceConfig(undefined).preset).toBe("balanced");
    expect(getRenderDistanceConfig("unknown" as never).visibleRadiusMeters).toBe(96);
  });

  it("supports the owner-defined 5–50 block steps and future-safe normalization", () => {
    expect(VIEW_DISTANCE_BLOCK_STEPS).toEqual([5, 10, 15, 20, 25, 30, 35, 40, 45, 50]);
    expect(normalizeViewDistanceBlocks(undefined)).toBe(25);
    expect(normalizeViewDistanceBlocks(7)).toBe(5);
    expect(normalizeViewDistanceBlocks(48)).toBe(50);
    expect(getBlockRenderDistanceConfig(5)).toMatchObject({ visibleRadiusMeters: 5, prefetchRadiusMeters: 10, label: "5 blocks" });
    expect(getBlockRenderDistanceConfig(50)).toMatchObject({ visibleRadiusMeters: 50, prefetchRadiusMeters: 68, label: "50 blocks" });
  });

  it("normalizes target FPS choices while keeping 120 as an explicit device-dependent option", () => {
    expect(TARGET_FPS_OPTIONS).toContain(5);
    expect(TARGET_FPS_OPTIONS).toContain(60);
    expect(TARGET_FPS_OPTIONS).toContain(120);
    expect(normalizeTargetFps(undefined)).toBe(60);
    expect(normalizeTargetFps(119)).toBe(120);
    expect(normalizeTargetFps(3)).toBe(5);
  });
});
