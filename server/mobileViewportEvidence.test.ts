import { describe, expect, it } from "vitest";
import { normalizeMobileViewport } from "../client/src/game/systems/mobileViewportPolicy";
import {
  auditMobileViewportEvidence,
  REQUIRED_LANDSCAPE_WIDTHS,
  type MobileViewportEvidenceInput,
  type ViewportObservation,
} from "./generators/mobileViewportEvidence";

const observations: ViewportObservation[] = REQUIRED_LANDSCAPE_WIDTHS.map(width => ({
  label: `landscape-${width}`,
  width,
  height: 240,
  safeAreaMeasured: true,
  touchObserved: true,
  fullscreenObserved: false,
}));

function validInput(overrides: Partial<MobileViewportEvidenceInput> = {}): MobileViewportEvidenceInput {
  return {
    source: "chromium-sandbox",
    policy: normalizeMobileViewport({ width: 768, height: 240, orientation: "landscape", safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, maxTouchPoints: 5, touchCapable: true, fullscreenAvailable: true }),
    observations,
    ...overrides,
  };
}

describe("mobile viewport evidence", () => {
  it("accepts complete landscape viewport observations while preserving explicit claim boundaries", () => {
    const result = auditMobileViewportEvidence(validInput());
    expect(result.summary.valid).toBe(true);
    expect(result.summary.observedWidths).toEqual([320, 390, 430, 768]);
    expect(result.summary.missingWidths).toEqual([]);
    expect(result.summary.measuredSafeAreaCount).toBe(4);
    expect(result.summary.touchObservedCount).toBe(4);
    expect(result.claims).toEqual({
      cssSafeAreaApplied: false,
      orientationLockApplied: false,
      fullscreenGuaranteed: false,
      realDeviceAcceptance: false,
      webViewAcceptance: false,
    });
  });

  it("requires all bounded landscape widths and measured safe-area signals", () => {
    const result = auditMobileViewportEvidence(validInput({ observations: observations.filter(observation => observation.width !== 390).map(observation => ({ ...observation, safeAreaMeasured: false })) }));
    expect(result.summary.issueCounts.REQUIRED_WIDTH_MISSING).toBe(1);
    expect(result.summary.issueCounts.SAFE_AREA_NOT_MEASURED).toBe(3);
    expect(result.summary.valid).toBe(false);
  });

  it("rejects portrait, conflicting, invalid, duplicate, and policy-mismatched observations", () => {
    const result = auditMobileViewportEvidence(validInput({
      policy: normalizeMobileViewport({ width: 320, height: 240, orientation: "portrait" }),
      observations: [
        { label: "bad", width: 240, height: 320, safeAreaMeasured: false, touchObserved: false, fullscreenObserved: false },
        { label: "bad", width: 0, height: 240, safeAreaMeasured: false, touchObserved: false, fullscreenObserved: false },
      ],
    }));
    expect(result.summary.issueCounts.DUPLICATE_VIEWPORT_LABEL).toBe(1);
    expect(result.summary.issueCounts.INVALID_VIEWPORT_DIMENSIONS).toBe(1);
    expect(result.summary.issueCounts.PORTRAIT_VIEWPORT).toBe(1);
    expect(result.summary.issueCounts.POLICY_DIMENSION_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.REQUIRED_WIDTH_MISSING).toBe(4);
    expect(result.summary.issueCounts.SAFE_AREA_NOT_MEASURED).toBe(1);
    expect(result.summary.issueCounts.ORIENTATION_CONFLICT).toBe(1);
  });

  it("keeps output deterministic across observation order and changes hash when evidence changes", () => {
    const input = validInput();
    const first = auditMobileViewportEvidence(input);
    const reordered = auditMobileViewportEvidence({ ...input, observations: [...input.observations].reverse() });
    expect(reordered).toEqual(first);
    const changed = auditMobileViewportEvidence({ ...input, observations: input.observations.map(observation => observation.width === 430 ? { ...observation, fullscreenObserved: true } : observation) });
    expect(changed.artifact.contentHash).not.toBe(first.artifact.contentHash);
  });

  it("rejects unsupported rules versions", () => {
    expect(() => auditMobileViewportEvidence(validInput({ rulesVersion: "unsupported" }))).toThrow("Unsupported mobile viewport evidence rules version");
  });
});
