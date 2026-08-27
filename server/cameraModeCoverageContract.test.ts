import { describe, expect, it } from "vitest";
import { CAMERA_MODES, DEFAULT_CAMERA_MODE, getCameraModePose } from "../client/src/game/systems/cameraModes";
import { buildCameraModeCoverageReport } from "./cameraModeCoverageContract";

describe("camera mode coverage contract", () => {
  it("projects all canonical in-map camera modes and their poses", () => {
    const report = buildCameraModeCoverageReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.camera-mode-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      defaultMode: DEFAULT_CAMERA_MODE,
      selectedMode: DEFAULT_CAMERA_MODE,
      selectedModeSource: "default-fallback",
      modeCount: CAMERA_MODES.length,
      modes: ["overhead", "first-person", "side"],
      issues: [],
    });
    expect(report.options.map(option => option.id)).toEqual([...CAMERA_MODES]);
    expect(report.poses.overhead).toEqual(getCameraModePose("overhead"));
    expect(report.poses["first-person"]).toEqual(getCameraModePose("first-person"));
    expect(report.poses.side).toEqual(getCameraModePose("side"));
    expect(report.firstPersonSupport).toEqual({ overhead: false, "first-person": true, side: false });
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("preserves a valid caller selection and produces deterministic metadata", () => {
    const input = { selectedMode: "side" };
    const first = buildCameraModeCoverageReport(input);
    const second = buildCameraModeCoverageReport(input);

    expect(first).toEqual(second);
    expect(first.selectedMode).toBe("side");
    expect(first.selectedModeSource).toBe("caller");
    expect(first.issues).toEqual([]);
  });

  it("fails closed to the overhead default for an unknown mode", () => {
    const report = buildCameraModeCoverageReport({ selectedMode: "orbit" });

    expect(report.selectedMode).toBe("overhead");
    expect(report.selectedModeSource).toBe("default-fallback");
    expect(report.issues).toEqual([{ code: "MODE_FALLBACK", detail: "unknown camera mode fell back to canonical default overhead" }]);
  });

  it("keeps runtime, persistence, touch, collision, device, and mobile claims false", () => {
    const report = buildCameraModeCoverageReport({ selectedMode: "first-person" });

    expect(report.claims).toEqual({ cameraApplied: false, cameraCallerConnected: false, playerStateWrite: false, touchValidated: false, collisionValidated: false, deviceSizeAccepted: false, mobileAccepted: false });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["camera-runtime-caller", "settings-persistence", "touch-collision-acceptance", "device-size-acceptance"]);
  });
});
