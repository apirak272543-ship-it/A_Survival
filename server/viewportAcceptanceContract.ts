import type { MobileViewportPolicy } from "../client/src/game/systems/mobileViewportPolicy";

export const MOBILE_ACCEPTANCE_WIDTHS = [320, 390, 430, 768] as const;

export type ViewportAcceptanceIssueCode =
  | "MISSING_VIEWPORT"
  | "ORIENTATION_CONFLICT"
  | "INVALID_SAFE_AREA"
  | "INVALID_USABLE_SPACE"
  | "INVALID_LAYOUT"
  | "TOUCH_NOT_READY";

export type ViewportAcceptanceIssue = {
  code: ViewportAcceptanceIssueCode;
  message: string;
};

export type ViewportAcceptanceResult = {
  valid: boolean;
  issues: ViewportAcceptanceIssue[];
  supportedWidth: boolean;
};

export function validateMobileViewportPolicy(policy: MobileViewportPolicy): ViewportAcceptanceResult {
  const issues: ViewportAcceptanceIssue[] = [];
  const { viewport, capabilities, layout } = policy;
  const width = viewport.width;
  const height = viewport.height;
  const supportedWidth = width !== null && MOBILE_ACCEPTANCE_WIDTHS.includes(width as (typeof MOBILE_ACCEPTANCE_WIDTHS)[number]);

  if (width === null || height === null) issues.push({ code: "MISSING_VIEWPORT", message: "width and height are required for mobile viewport acceptance" });
  if (viewport.orientationConflict) issues.push({ code: "ORIENTATION_CONFLICT", message: "supplied and measured orientation must agree" });
  if (!viewport.safeAreaMeasured || Object.values(viewport.safeArea).some(value => !Number.isInteger(value) || value < 0)) issues.push({ code: "INVALID_SAFE_AREA", message: "safe-area insets must be measured non-negative integers" });
  if (width !== null && height !== null && (viewport.usableWidth === null || viewport.usableHeight === null || viewport.usableWidth > width || viewport.usableHeight > height || viewport.usableWidth < 0 || viewport.usableHeight < 0)) {
    issues.push({ code: "INVALID_USABLE_SPACE", message: "usable viewport space must remain within measured dimensions" });
  }
  if (layout.canvasFit !== "cover" || (viewport.orientation === "landscape" && layout.recommendation !== "landscape-ready") || (viewport.orientation === "portrait" && layout.recommendation !== "portrait-blocked")) {
    issues.push({ code: "INVALID_LAYOUT", message: "layout recommendation must match orientation and use cover canvas fit" });
  }
  if (capabilities.touchCapable !== true || (capabilities.maxTouchPoints !== null && capabilities.maxTouchPoints < 1)) issues.push({ code: "TOUCH_NOT_READY", message: "mobile acceptance requires touch capability" });
  return { valid: issues.length === 0, issues, supportedWidth };
}

export function validateMobileViewportMatrix(policies: readonly MobileViewportPolicy[]) {
  const issues: ViewportAcceptanceIssue[] = [];
  const widths = new Set<number>();
  for (const policy of policies) {
    const result = validateMobileViewportPolicy(policy);
    issues.push(...result.issues);
    if (policy.viewport.width !== null) widths.add(policy.viewport.width);
  }
  for (const width of MOBILE_ACCEPTANCE_WIDTHS) {
    if (!widths.has(width)) issues.push({ code: "MISSING_VIEWPORT", message: `acceptance matrix is missing width ${width}` });
  }
  return { valid: issues.length === 0, issues };
}
