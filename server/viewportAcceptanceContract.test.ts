import { describe, expect, it } from "vitest";
import { normalizeMobileViewport } from "../client/src/game/systems/mobileViewportPolicy";
import { validateMobileViewportMatrix, validateMobileViewportPolicy } from "./viewportAcceptanceContract";

describe("mobile viewport acceptance contract", () => {
  it("accepts a measured landscape touch viewport with safe-area insets", () => {
    const policy = normalizeMobileViewport({ width: 390, height: 844, safeArea: { top: 24, right: 0, bottom: 16, left: 0 }, maxTouchPoints: 5, touchCapable: true, fullscreenAvailable: true });
    const result = validateMobileViewportPolicy(policy);

    expect(result.valid).toBe(true);
    expect(result.supportedWidth).toBe(true);
    expect(policy.viewport.usableWidth).toBe(390);
    expect(policy.viewport.usableHeight).toBe(804);
  });

  it("covers the required viewport-width acceptance matrix", () => {
    const policies = [320, 390, 430, 768].map(width => normalizeMobileViewport({ width, height: 480, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, maxTouchPoints: 2, touchCapable: true }));

    expect(validateMobileViewportMatrix(policies)).toEqual({ valid: true, issues: [] });
  });

  it("rejects missing measurement, orientation conflict and non-touch capability", () => {
    const policy = normalizeMobileViewport({ width: 390, height: 844, orientation: "landscape", safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, maxTouchPoints: 0, touchCapable: false });
    const result = validateMobileViewportPolicy(policy);
    const codes = result.issues.map(issue => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("ORIENTATION_CONFLICT");
    expect(codes).toContain("TOUCH_NOT_READY");
  });

  it("rejects an incomplete acceptance matrix", () => {
    const policies = [normalizeMobileViewport({ width: 390, height: 844, safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, maxTouchPoints: 2, touchCapable: true })];

    expect(validateMobileViewportMatrix(policies).issues.map(issue => issue.message)).toEqual([
      "acceptance matrix is missing width 320",
      "acceptance matrix is missing width 430",
      "acceptance matrix is missing width 768",
    ]);
  });
});
