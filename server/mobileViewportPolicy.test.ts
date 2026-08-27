import { describe, expect, it } from "vitest";
import { normalizeMobileViewport } from "../client/src/game/systems/mobileViewportPolicy";

describe("mobile viewport policy", () => {
  it("normalizes a measured landscape viewport with safe-area insets", () => {
    const policy = normalizeMobileViewport({ width: 1280, height: 720, orientation: "landscape", safeArea: { top: 24, right: 18, bottom: 20, left: 16 }, maxTouchPoints: 5, fullscreenAvailable: true });
    expect(policy).toMatchObject({ policyVersion: "mobile-viewport-policy.v1", viewport: { width: 1280, height: 720, orientation: "landscape", orientationConflict: false, usableWidth: 1246, usableHeight: 676, safeArea: { top: 24, right: 18, bottom: 20, left: 16 }, safeAreaMeasured: true }, capabilities: { touchCapable: true, maxTouchPoints: 5, fullscreenAvailable: true }, layout: { recommendation: "landscape-ready", canvasFit: "cover", controlDensity: "standard", portraitWarningExpected: false } });
    expect(policy.claims).toEqual({ viewportNormalizedOnce: true, cssSafeAreaApplied: false, orientationLockApplied: false, fullscreenGuaranteed: false, realDeviceAcceptance: false, webViewAcceptance: false, playerStateWrite: false });
  });

  it("blocks portrait layouts and derives touch capability from touch points", () => {
    const policy = normalizeMobileViewport({ width: 390, height: 844, maxTouchPoints: 2 });
    expect(policy.viewport.orientation).toBe("portrait");
    expect(policy.layout).toMatchObject({ recommendation: "portrait-blocked", controlDensity: "compact", portraitWarningExpected: true });
    expect(policy.capabilities).toMatchObject({ touchCapable: true, maxTouchPoints: 2, fullscreenAvailable: null });
  });

  it("fails closed on an orientation conflict instead of choosing an unsafe layout", () => {
    const policy = normalizeMobileViewport({ width: 1280, height: 720, orientation: "portrait", touchCapable: true });
    expect(policy.viewport).toMatchObject({ orientation: "unknown", orientationConflict: true, usableWidth: 1280, usableHeight: 720 });
    expect(policy.layout).toMatchObject({ recommendation: "unknown-viewport", controlDensity: "standard", portraitWarningExpected: false });
  });

  it("keeps unknown viewport and capability signals explicit", () => {
    const policy = normalizeMobileViewport({ width: "1280", height: null, safeArea: { top: -1, right: 400, bottom: "bad", left: 8 }, maxTouchPoints: "2", touchCapable: undefined, fullscreenAvailable: "yes" });
    expect(policy.viewport).toMatchObject({ width: null, height: null, orientation: "unknown", usableWidth: null, usableHeight: null, safeArea: { top: 0, right: 256, bottom: 0, left: 8 }, safeAreaMeasured: false });
    expect(policy.capabilities).toEqual({ touchCapable: null, maxTouchPoints: null, fullscreenAvailable: null });
    expect(policy.layout).toMatchObject({ recommendation: "unknown-viewport", controlDensity: "unknown" });
  });

  it("clamps dimensions, safe-area values and touch points to bounded limits", () => {
    const policy = normalizeMobileViewport({ width: 99_999, height: 99_999, safeArea: { top: 999, right: 300, bottom: 257, left: 256 }, maxTouchPoints: 999 });
    expect(policy.viewport).toMatchObject({ width: 16_384, height: 16_384, orientation: "landscape", safeArea: { top: 256, right: 256, bottom: 256, left: 256 }, safeAreaMeasured: true, usableWidth: 15_872, usableHeight: 15_872 });
    expect(policy.capabilities.maxTouchPoints).toBe(32);
  });

  it("keeps explicit touch false authoritative and never writes player state", () => {
    const policy = normalizeMobileViewport({ width: 800, height: 480, touchCapable: false, maxTouchPoints: 4, fullscreenAvailable: false });
    expect(policy.capabilities).toEqual({ touchCapable: false, maxTouchPoints: 4, fullscreenAvailable: false });
    expect(policy.claims).toMatchObject({ cssSafeAreaApplied: false, orientationLockApplied: false, fullscreenGuaranteed: false, realDeviceAcceptance: false, webViewAcceptance: false, playerStateWrite: false });
  });
});
