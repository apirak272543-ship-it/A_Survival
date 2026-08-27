import { describe, expect, it } from "vitest";
import { cameraRelativeMovement, CAMERA_MODE_OPTIONS, getCameraModeOption, normalizeCameraMode } from "../client/src/game/systems/cameraModes";

describe("camera mode contract", () => {
  it("exposes player-selectable overhead, first-person and side modes", () => {
    expect(CAMERA_MODE_OPTIONS.map(option => option.id)).toEqual(["overhead", "first-person", "side"]);
    expect(getCameraModeOption("first-person").shortLabel).toBe("FIRST PERSON");
    expect(getCameraModeOption("unknown").id).toBe("overhead");
    expect(normalizeCameraMode("side")).toBe("side");
    expect(normalizeCameraMode("invalid")).toBe("overhead");
  });

  it("keeps movement camera-relative without changing the player coordinate contract", () => {
    const overheadForward = cameraRelativeMovement("overhead", 0, 1);
    expect(overheadForward.x).toBeCloseTo(-Math.SQRT1_2, 5);
    expect(overheadForward.z).toBeCloseTo(Math.SQRT1_2, 5);
    const sideForward = cameraRelativeMovement("side", 0, 1);
    expect(sideForward.x).toBeCloseTo(0, 5);
    expect(sideForward.z).toBeCloseTo(1, 5);
    const firstPersonForward = cameraRelativeMovement("first-person", 0, 1, Math.PI / 2);
    expect(firstPersonForward.x).toBeCloseTo(1, 5);
    expect(firstPersonForward.z).toBeCloseTo(0, 5);
  });
});
