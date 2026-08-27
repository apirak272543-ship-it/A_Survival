import { describe, expect, it } from "vitest";
import { shouldEnableRuntimeObject } from "../client/src/game/systems/runtimeVisibilitySystem";

describe("runtime spatial visibility policy", () => {
  const base = { positionX: 0, positionZ: 0, viewDistanceBlocks: 15 };

  it("keeps an object inside the tier view radius and culls one outside it", () => {
    expect(shouldEnableRuntimeObject({ x: 12, z: 0 }, base)).toBe(true);
    expect(shouldEnableRuntimeObject({ x: 16, z: 0 }, base)).toBe(false);
    expect(shouldEnableRuntimeObject({ x: 12, z: 12 }, base)).toBe(false);
  });

  it("supports coordinate metadata used by placed world blocks", () => {
    expect(shouldEnableRuntimeObject({ coordinate: { x: 15, z: 0 } }, base)).toBe(true);
    expect(shouldEnableRuntimeObject({ coordinate: { x: 15.1, z: 0 } }, base)).toBe(false);
  });

  it("applies a bounded safety padding without opening a second map radius", () => {
    expect(shouldEnableRuntimeObject({ x: 16, z: 0 }, { ...base, safetyPaddingBlocks: 1 })).toBe(true);
    expect(shouldEnableRuntimeObject({ x: 17.1, z: 0 }, { ...base, safetyPaddingBlocks: 1 })).toBe(false);
  });

  it("never re-enables a broken object and preserves malformed metadata", () => {
    expect(shouldEnableRuntimeObject({ x: 1, z: 1, state: "broken" }, base)).toBe(false);
    expect(shouldEnableRuntimeObject({ x: "unknown", z: 1 }, base)).toBe(true);
    expect(shouldEnableRuntimeObject(undefined, base)).toBe(true);
    expect(shouldEnableRuntimeObject({ x: 1000, z: 1000 }, { ...base, viewDistanceBlocks: Number.NaN })).toBe(true);
  });
});
