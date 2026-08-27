import type { MobileViewportPolicy } from "../../client/src/game/systems/mobileViewportPolicy";
import { hashStableJson } from "./commonGeneratorApi";

export const MOBILE_VIEWPORT_EVIDENCE_VERSION = "1.0.0" as const;
export const MOBILE_VIEWPORT_EVIDENCE_RULES_VERSION = "mobile-viewport-evidence-rules.v1" as const;
export const REQUIRED_LANDSCAPE_WIDTHS = [320, 390, 430, 768] as const;

export type ViewportEvidenceSource = "chromium-sandbox" | "real-device" | "webview" | "synthetic";

export type ViewportObservation = {
  label: string;
  width: number;
  height: number;
  safeAreaMeasured: boolean;
  touchObserved: boolean;
  fullscreenObserved: boolean;
};

export type MobileViewportEvidenceInput = {
  source: ViewportEvidenceSource;
  policy: MobileViewportPolicy;
  observations: readonly ViewportObservation[];
  rulesVersion?: string;
};

export type MobileViewportEvidenceIssueCode =
  | "DUPLICATE_VIEWPORT_LABEL"
  | "INVALID_VIEWPORT_DIMENSIONS"
  | "REQUIRED_WIDTH_MISSING"
  | "PORTRAIT_VIEWPORT"
  | "ORIENTATION_CONFLICT"
  | "SAFE_AREA_NOT_MEASURED"
  | "POLICY_DIMENSION_MISMATCH";

export type MobileViewportEvidenceIssue = {
  code: MobileViewportEvidenceIssueCode;
  recordId: string;
  detail: string;
};

export type MobileViewportEvidenceOutput = {
  artifact: {
    generatorId: "mobile.viewport-evidence";
    generatorVersion: typeof MOBILE_VIEWPORT_EVIDENCE_VERSION;
    rulesVersion: typeof MOBILE_VIEWPORT_EVIDENCE_RULES_VERSION;
    contentHash: string;
    source: ViewportEvidenceSource;
    observationCount: number;
  };
  summary: {
    valid: boolean;
    requiredWidths: number[];
    observedWidths: number[];
    missingWidths: number[];
    measuredSafeAreaCount: number;
    touchObservedCount: number;
    fullscreenObservedCount: number;
    issueCounts: Record<MobileViewportEvidenceIssueCode, number>;
  };
  issues: MobileViewportEvidenceIssue[];
  claims: {
    cssSafeAreaApplied: false;
    orientationLockApplied: false;
    fullscreenGuaranteed: false;
    realDeviceAcceptance: false;
    webViewAcceptance: false;
  };
};

const ISSUE_CODES: MobileViewportEvidenceIssueCode[] = [
  "DUPLICATE_VIEWPORT_LABEL",
  "INVALID_VIEWPORT_DIMENSIONS",
  "REQUIRED_WIDTH_MISSING",
  "PORTRAIT_VIEWPORT",
  "ORIENTATION_CONFLICT",
  "SAFE_AREA_NOT_MEASURED",
  "POLICY_DIMENSION_MISMATCH",
];

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function emptyIssueCounts(): Record<MobileViewportEvidenceIssueCode, number> {
  return Object.fromEntries(ISSUE_CODES.map(code => [code, 0])) as Record<MobileViewportEvidenceIssueCode, number>;
}

function addIssue(issues: MobileViewportEvidenceIssue[], issue: MobileViewportEvidenceIssue) {
  if (!issues.some(existing => existing.code === issue.code && existing.recordId === issue.recordId && existing.detail === issue.detail)) issues.push(issue);
}

function isFinitePositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

export function auditMobileViewportEvidence(input: MobileViewportEvidenceInput): MobileViewportEvidenceOutput {
  const rulesVersion = input.rulesVersion ?? MOBILE_VIEWPORT_EVIDENCE_RULES_VERSION;
  if (rulesVersion !== MOBILE_VIEWPORT_EVIDENCE_RULES_VERSION) throw new Error(`Unsupported mobile viewport evidence rules version: ${rulesVersion}`);
  const issues: MobileViewportEvidenceIssue[] = [];
  const issueCounts = emptyIssueCounts();
  const observations = [...input.observations].sort((left, right) => compareStrings(left.label, right.label) || left.width - right.width || left.height - right.height);
  const labels = new Set<string>();
  const observedWidths = new Set<number>();
  let policyMatchesObservation = input.policy.viewport.width === null || input.policy.viewport.height === null;
  for (const observation of observations) {
    const recordId = observation.label;
    if (labels.has(recordId)) addIssue(issues, { code: "DUPLICATE_VIEWPORT_LABEL", recordId, detail: `Viewport observation label is duplicated: ${recordId}` });
    labels.add(recordId);
    if (!isFinitePositiveInteger(observation.width) || !isFinitePositiveInteger(observation.height)) {
      addIssue(issues, { code: "INVALID_VIEWPORT_DIMENSIONS", recordId, detail: "Viewport observation dimensions must be positive integers" });
      continue;
    }
    observedWidths.add(observation.width);
    if (observation.width < observation.height) addIssue(issues, { code: "PORTRAIT_VIEWPORT", recordId, detail: "M-01 acceptance evidence requires landscape viewport observations" });
    if (!observation.safeAreaMeasured) addIssue(issues, { code: "SAFE_AREA_NOT_MEASURED", recordId, detail: "Safe-area behavior was not measured for this viewport observation" });
    const normalizedPolicyWidth = input.policy.viewport.width;
    const normalizedPolicyHeight = input.policy.viewport.height;
    if (normalizedPolicyWidth === observation.width && normalizedPolicyHeight === observation.height) policyMatchesObservation = true;
  }
  if (input.policy.viewport.orientationConflict) addIssue(issues, { code: "ORIENTATION_CONFLICT", recordId: "policy", detail: "Normalized viewport policy reports an orientation conflict" });
  if (!policyMatchesObservation) {
    addIssue(issues, {
      code: "POLICY_DIMENSION_MISMATCH",
      recordId: "policy",
      detail: `Policy dimensions ${input.policy.viewport.width}x${input.policy.viewport.height} do not match any observation`,
    });
  }
  const missingWidths = REQUIRED_LANDSCAPE_WIDTHS.filter(width => !observedWidths.has(width));
  for (const width of missingWidths) addIssue(issues, { code: "REQUIRED_WIDTH_MISSING", recordId: `width-${width}`, detail: `Required landscape viewport width ${width}px has no observation` });
  const sortedIssues = issues.sort((left, right) => compareStrings(left.code, right.code) || compareStrings(left.recordId, right.recordId) || compareStrings(left.detail, right.detail));
  for (const issue of sortedIssues) issueCounts[issue.code] += 1;
  const contentHash = hashStableJson({ rulesVersion, source: input.source, policy: input.policy, observations, issues: sortedIssues } as never);
  return {
    artifact: {
      generatorId: "mobile.viewport-evidence",
      generatorVersion: MOBILE_VIEWPORT_EVIDENCE_VERSION,
      rulesVersion: MOBILE_VIEWPORT_EVIDENCE_RULES_VERSION,
      contentHash,
      source: input.source,
      observationCount: observations.length,
    },
    summary: {
      valid: sortedIssues.length === 0,
      requiredWidths: [...REQUIRED_LANDSCAPE_WIDTHS],
      observedWidths: Array.from(observedWidths).sort((left, right) => left - right),
      missingWidths,
      measuredSafeAreaCount: observations.filter(observation => observation.safeAreaMeasured).length,
      touchObservedCount: observations.filter(observation => observation.touchObserved).length,
      fullscreenObservedCount: observations.filter(observation => observation.fullscreenObserved).length,
      issueCounts,
    },
    issues: sortedIssues,
    claims: {
      cssSafeAreaApplied: false,
      orientationLockApplied: false,
      fullscreenGuaranteed: false,
      realDeviceAcceptance: false,
      webViewAcceptance: false,
    },
  };
}
