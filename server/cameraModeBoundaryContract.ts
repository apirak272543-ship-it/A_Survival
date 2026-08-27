import {
  CAMERA_MODES,
  DEFAULT_IN_MAP_SETTINGS,
  getCameraModeOption,
  getCameraModePose,
  normalizeCameraMode,
  normalizeInMapSettings,
  type InMapSettings,
  type CameraMode,
} from "../client/src/game/systems/cameraModes";

export const CAMERA_MODE_BOUNDARY_VERSION = "camera-mode-boundary.v1" as const;

export type CameraModeBoundaryInput = {
  mode: unknown;
  settings?: unknown;
};

export type CameraModeBoundaryResult = {
  contractVersion: typeof CAMERA_MODE_BOUNDARY_VERSION;
  valid: true;
  usedModeFallback: boolean;
  usedSettingsFallback: boolean;
  mode: CameraMode;
  option: ReturnType<typeof getCameraModeOption>;
  pose: ReturnType<typeof getCameraModePose>;
  settings: InMapSettings;
  supportedModes: readonly CameraMode[];
  warnings: string[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function settingsEqual(left: InMapSettings, right: InMapSettings) {
  return left.cameraMode === right.cameraMode && left.viewDistanceBlocks === right.viewDistanceBlocks && left.targetFps === right.targetFps;
}

export function evaluateCameraModeBoundary(input: CameraModeBoundaryInput): CameraModeBoundaryResult {
  const mode = normalizeCameraMode(input.mode);
  const candidateSettings = isRecord(input.settings) ? input.settings as Partial<InMapSettings> : undefined;
  const settings = normalizeInMapSettings(candidateSettings);
  const warnings: string[] = [];
  if (input.mode !== mode) warnings.push(`camera mode normalized to ${mode}`);
  if (!candidateSettings || !settingsEqual(settings, { ...DEFAULT_IN_MAP_SETTINGS, ...candidateSettings } as InMapSettings)) warnings.push("in-map settings normalized to supported values");
  const option = getCameraModeOption(mode);
  return {
    contractVersion: CAMERA_MODE_BOUNDARY_VERSION,
    valid: true,
    usedModeFallback: input.mode !== mode,
    usedSettingsFallback: warnings.includes("in-map settings normalized to supported values"),
    mode,
    option,
    pose: getCameraModePose(mode),
    settings,
    supportedModes: CAMERA_MODES,
    warnings,
  };
}
