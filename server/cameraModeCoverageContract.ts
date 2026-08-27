import {
  CAMERA_MODE_OPTIONS,
  CAMERA_MODES,
  DEFAULT_CAMERA_MODE,
  getCameraModePose,
  normalizeCameraMode,
  supportsFirstPerson,
  type CameraMode,
} from "../client/src/game/systems/cameraModes";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const CAMERA_MODE_COVERAGE_SCHEMA_VERSION = "a-survival.camera-mode-coverage.v1" as const;
export const CAMERA_MODE_COVERAGE_CONTRACT_VERSION = "1.0.0" as const;

export type CameraModeCoverageInput = {
  selectedMode?: unknown;
};

type CameraModeCoverageIssue = {
  code: "MODE_FALLBACK";
  detail: string;
};

export type CameraModeCoverageReport = {
  schemaVersion: typeof CAMERA_MODE_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof CAMERA_MODE_COVERAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: true;
  defaultMode: CameraMode;
  selectedMode: CameraMode;
  selectedModeSource: "caller" | "default-fallback";
  modeCount: number;
  modes: readonly CameraMode[];
  options: Array<{
    id: CameraMode;
    value: CameraMode;
    label: string;
    shortLabel: string;
    purpose: string;
    description: string;
  }>;
  poses: Record<CameraMode, ReturnType<typeof getCameraModePose>>;
  firstPersonSupport: Record<CameraMode, boolean>;
  issues: CameraModeCoverageIssue[];
  blockers: [
    { id: "camera-runtime-caller"; required: true; status: "missing-evidence"; reason: string },
    { id: "settings-persistence"; required: true; status: "missing-evidence"; reason: string },
    { id: "touch-collision-acceptance"; required: true; status: "missing-evidence"; reason: string },
    { id: "device-size-acceptance"; required: true; status: "missing-evidence"; reason: string },
  ];
  claims: {
    cameraApplied: false;
    cameraCallerConnected: false;
    playerStateWrite: false;
    touchValidated: false;
    collisionValidated: false;
    deviceSizeAccepted: false;
    mobileAccepted: false;
  };
  contentSha256: string;
};

function buildBlockers(): CameraModeCoverageReport["blockers"] {
  return [
    { id: "camera-runtime-caller", required: true, status: "missing-evidence", reason: "the report projects canonical mode metadata but does not connect a camera caller or GameCanvas" },
    { id: "settings-persistence", required: true, status: "missing-evidence", reason: "global/in-map settings persistence is an owner and checkpoint separate from this pure coverage audit" },
    { id: "touch-collision-acceptance", required: true, status: "missing-evidence", reason: "mode poses are numeric metadata; touch controls and collision behavior are not tested here" },
    { id: "device-size-acceptance", required: true, status: "missing-evidence", reason: "no 320/390/430/768 viewport or real device/WebView acceptance is claimed" },
  ];
}

export function buildCameraModeCoverageReport(input: CameraModeCoverageInput = {}): CameraModeCoverageReport {
  const hasCanonicalCallerMode = CAMERA_MODES.includes(input.selectedMode as CameraMode);
  const selectedMode = normalizeCameraMode(input.selectedMode);
  const issues: CameraModeCoverageIssue[] = hasCanonicalCallerMode || input.selectedMode === undefined
    ? []
    : [{ code: "MODE_FALLBACK", detail: `unknown camera mode fell back to canonical default ${DEFAULT_CAMERA_MODE}` }];
  const options = CAMERA_MODE_OPTIONS.map(option => ({ ...option }));
  const poses = Object.fromEntries(CAMERA_MODES.map(mode => [mode, getCameraModePose(mode)])) as Record<CameraMode, ReturnType<typeof getCameraModePose>>;
  const firstPersonSupport = Object.fromEntries(CAMERA_MODES.map(mode => [mode, supportsFirstPerson(mode)])) as Record<CameraMode, boolean>;
  const payload = {
    schemaVersion: CAMERA_MODE_COVERAGE_SCHEMA_VERSION,
    contractVersion: CAMERA_MODE_COVERAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: true,
    defaultMode: DEFAULT_CAMERA_MODE,
    selectedMode,
    selectedModeSource: input.selectedMode === undefined || !hasCanonicalCallerMode ? "default-fallback" as const : "caller" as const,
    modeCount: CAMERA_MODES.length,
    modes: CAMERA_MODES,
    options,
    poses,
    firstPersonSupport,
    issues,
    blockers: buildBlockers(),
    claims: { cameraApplied: false as const, cameraCallerConnected: false as const, playerStateWrite: false as const, touchValidated: false as const, collisionValidated: false as const, deviceSizeAccepted: false as const, mobileAccepted: false as const },
  } satisfies Omit<CameraModeCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
