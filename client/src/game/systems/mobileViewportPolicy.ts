export const MOBILE_VIEWPORT_POLICY_VERSION = "mobile-viewport-policy.v1" as const;

export type MobileOrientation = "landscape" | "portrait" | "unknown";
export type MobileViewportInput = {
  width?: unknown;
  height?: unknown;
  orientation?: unknown;
  safeArea?: unknown;
  maxTouchPoints?: unknown;
  touchCapable?: unknown;
  fullscreenAvailable?: unknown;
};

export type SafeAreaInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type MobileViewportPolicy = {
  policyVersion: typeof MOBILE_VIEWPORT_POLICY_VERSION;
  viewport: {
    width: number | null;
    height: number | null;
    orientation: MobileOrientation;
    orientationConflict: boolean;
    usableWidth: number | null;
    usableHeight: number | null;
    safeArea: SafeAreaInsets;
    safeAreaMeasured: boolean;
  };
  capabilities: {
    touchCapable: boolean | null;
    maxTouchPoints: number | null;
    fullscreenAvailable: boolean | null;
  };
  layout: {
    recommendation: "landscape-ready" | "portrait-blocked" | "unknown-viewport";
    canvasFit: "cover";
    controlDensity: "compact" | "standard" | "unknown";
    portraitWarningExpected: boolean;
  };
  claims: {
    viewportNormalizedOnce: true;
    cssSafeAreaApplied: false;
    orientationLockApplied: false;
    fullscreenGuaranteed: false;
    realDeviceAcceptance: false;
    webViewAcceptance: false;
    playerStateWrite: false;
  };
};

const SAFE_AREA_MAX_PX = 256;
const VIEWPORT_MAX_PX = 16_384;

function finiteDimension(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return null;
  return Math.min(VIEWPORT_MAX_PX, Math.floor(value));
}

function nonNegativeInteger(value: unknown, max: number): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) return null;
  return Math.min(max, Math.floor(value));
}

function safeAreaInsets(value: unknown): { safeArea: SafeAreaInsets; measured: boolean } {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { safeArea: { top: 0, right: 0, bottom: 0, left: 0 }, measured: false };
  const source = value as Record<string, unknown>;
  const values = {
    top: nonNegativeInteger(source.top, SAFE_AREA_MAX_PX),
    right: nonNegativeInteger(source.right, SAFE_AREA_MAX_PX),
    bottom: nonNegativeInteger(source.bottom, SAFE_AREA_MAX_PX),
    left: nonNegativeInteger(source.left, SAFE_AREA_MAX_PX),
  };
  const measured = Object.values(values).every(value => value !== null);
  return {
    safeArea: {
      top: values.top ?? 0,
      right: values.right ?? 0,
      bottom: values.bottom ?? 0,
      left: values.left ?? 0,
    },
    measured,
  };
}

function inputOrientation(value: unknown): MobileOrientation {
  return value === "landscape" || value === "portrait" ? value : "unknown";
}

function derivedOrientation(width: number | null, height: number | null): MobileOrientation {
  if (width === null || height === null) return "unknown";
  return width >= height ? "landscape" : "portrait";
}

export function normalizeMobileViewport(input: MobileViewportInput = {}): MobileViewportPolicy {
  const width = finiteDimension(input.width);
  const height = finiteDimension(input.height);
  const suppliedOrientation = inputOrientation(input.orientation);
  const measuredOrientation = derivedOrientation(width, height);
  const orientationConflict = suppliedOrientation !== "unknown" && measuredOrientation !== "unknown" && suppliedOrientation !== measuredOrientation;
  const orientation: MobileOrientation = orientationConflict ? "unknown" : measuredOrientation !== "unknown" ? measuredOrientation : suppliedOrientation;
  const { safeArea, measured: safeAreaMeasured } = safeAreaInsets(input.safeArea);
  const usableWidth = width === null ? null : Math.max(0, width - safeArea.left - safeArea.right);
  const usableHeight = height === null ? null : Math.max(0, height - safeArea.top - safeArea.bottom);
  const maxTouchPoints = nonNegativeInteger(input.maxTouchPoints, 32);
  const touchCapable = typeof input.touchCapable === "boolean" ? input.touchCapable : maxTouchPoints === null ? null : maxTouchPoints > 0;
  const fullscreenAvailable = typeof input.fullscreenAvailable === "boolean" ? input.fullscreenAvailable : null;
  return {
    policyVersion: MOBILE_VIEWPORT_POLICY_VERSION,
    viewport: { width, height, orientation, orientationConflict, usableWidth, usableHeight, safeArea, safeAreaMeasured },
    capabilities: { touchCapable, maxTouchPoints, fullscreenAvailable },
    layout: {
      recommendation: orientation === "landscape" ? "landscape-ready" : orientation === "portrait" ? "portrait-blocked" : "unknown-viewport",
      canvasFit: "cover",
      controlDensity: usableWidth === null ? "unknown" : usableWidth < 640 ? "compact" : "standard",
      portraitWarningExpected: orientation === "portrait",
    },
    claims: { viewportNormalizedOnce: true, cssSafeAreaApplied: false, orientationLockApplied: false, fullscreenGuaranteed: false, realDeviceAcceptance: false, webViewAcceptance: false, playerStateWrite: false },
  };
}
