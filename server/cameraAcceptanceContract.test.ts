import { describe, expect, it } from "vitest";
import { CAMERA_ACCEPTANCE_PROFILES, validateCameraAcceptanceProfiles } from "./cameraAcceptanceContract";

describe("camera acceptance contract", () => {
  it("covers overhead, first-person and side modes with explicit player visibility", () => {
    const result = validateCameraAcceptanceProfiles();

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.profiles.map(profile => profile.mode)).toEqual(["overhead", "first-person", "side"]);
    expect(result.profiles.find(profile => profile.mode === "first-person")?.playerVisible).toBe(false);
    expect(result.profiles.find(profile => profile.mode === "side")?.playerVisible).toBe(true);
  });

  it("is deterministic when validating the canonical profiles", () => {
    expect(validateCameraAcceptanceProfiles(CAMERA_ACCEPTANCE_PROFILES)).toEqual(validateCameraAcceptanceProfiles(CAMERA_ACCEPTANCE_PROFILES));
  });

  it("rejects duplicate or missing mode profiles and invalid user intent", () => {
    const result = validateCameraAcceptanceProfiles([
      { ...CAMERA_ACCEPTANCE_PROFILES[0]!, touchFriendly: false, purpose: "" },
      { ...CAMERA_ACCEPTANCE_PROFILES[0]! },
    ]);
    const codes = result.issues.map(issue => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("DUPLICATE_MODE");
    expect(codes).toContain("INVALID_TOUCH_INTENT");
    expect(codes).toContain("INVALID_PURPOSE");
    expect(codes.filter(code => code === "MISSING_MODE")).toHaveLength(2);
  });

  it("rejects a mode that violates player visibility semantics", () => {
    const result = validateCameraAcceptanceProfiles([
      { ...CAMERA_ACCEPTANCE_PROFILES[0]! },
      { ...CAMERA_ACCEPTANCE_PROFILES[1]!, playerVisible: true },
      { ...CAMERA_ACCEPTANCE_PROFILES[2]! },
    ]);

    expect(result.valid).toBe(false);
    expect(result.issues).toContainEqual(expect.objectContaining({ code: "INVALID_VISIBILITY", mode: "first-person" }));
  });
});
