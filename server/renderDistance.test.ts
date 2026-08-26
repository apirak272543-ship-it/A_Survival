import { describe, expect, it } from "vitest";
import { getRenderDistanceConfig, RENDER_DISTANCE_PRESETS } from "../client/src/game/systems/renderDistance";

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
});
