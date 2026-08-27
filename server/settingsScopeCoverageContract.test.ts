import { describe, expect, it } from "vitest";
import { DEFAULT_IN_MAP_SETTINGS } from "../client/src/game/systems/cameraModes";
import { buildSettingsScopeCoverageReport } from "./settingsScopeCoverageContract";

describe("settings scope coverage contract", () => {
  it("projects canonical in-map settings and leaves global scope explicitly unowned", () => {
    const report = buildSettingsScopeCoverageReport({ scope: "in-map", candidate: { cameraMode: "side", viewDistanceBlocks: 50, targetFps: 120 } });

    expect(report).toMatchObject({
      schemaVersion: "a-survival.settings-scope-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      requestedScope: "in-map",
      scopeSource: "caller",
      inMapSettingsOwner: "cameraModes.ts",
      globalSettingsOwner: "unowned-in-repository-scan",
      inMapSettingsSupported: true,
      globalSettingsSupported: false,
      inMapSettingsKeys: ["cameraMode", "viewDistanceBlocks", "targetFps"],
      globalSettingsKeys: [],
      defaultInMapSettings: DEFAULT_IN_MAP_SETTINGS,
      normalizedInMapSettings: { cameraMode: "side", viewDistanceBlocks: 50, targetFps: 120 },
      candidateSource: "canonical-normalization",
      issues: [],
    });
    expect(report.candidateKeys).toEqual(["cameraMode", "targetFps", "viewDistanceBlocks"]);
  });

  it("fails closed to in-map defaults for an unknown scope or malformed candidate", () => {
    const report = buildSettingsScopeCoverageReport({ scope: "session", candidate: "bad" });

    expect(report.requestedScope).toBe("in-map");
    expect(report.scopeSource).toBe("default-fallback");
    expect(report.normalizedInMapSettings).toEqual(DEFAULT_IN_MAP_SETTINGS);
    expect(report.candidateSource).toBe("default-fallback");
    expect(report.issues.map(issue => issue.code)).toEqual(["SCOPE_FALLBACK", "CANDIDATE_FALLBACK"]);
  });

  it("does not fabricate a global setting value or persistence capability", () => {
    const report = buildSettingsScopeCoverageReport({ scope: "global", candidate: { theme: "dark", language: "th" } });

    expect(report.requestedScope).toBe("global");
    expect(report.normalizedInMapSettings).toBeNull();
    expect(report.candidateSource).toBe("not-applicable");
    expect(report.issues).toEqual([{ code: "GLOBAL_SCOPE_UNOWNED", detail: "no canonical global settings owner was found; no global value is normalized or written" }]);
    expect(report.persistence).toEqual({ writeAllowed: false, writeAttempted: false, reloadVerified: false, callerConnected: false });
  });

  it("keeps UI, persistence, device, and future-map claims false and hashes deterministically", () => {
    const input = { scope: "in-map", candidate: { cameraMode: "first-person", viewDistanceBlocks: 5, targetFps: 15 } };
    const first = buildSettingsScopeCoverageReport(input);
    const second = buildSettingsScopeCoverageReport(input);

    expect(first).toEqual(second);
    expect(first.claims).toEqual({ inMapSettingsNormalized: true, globalSettingsNormalized: false, settingsWritten: false, persistenceConnected: false, uiConnected: false, playerVisible: false, deviceAccepted: false, futureMapMutated: false });
    expect(first.blockers.map(blocker => blocker.id)).toEqual(["global-settings-owner", "settings-persistence-caller", "all-entry-routes", "pause-focus-integration"]);
    expect(first.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });
});
