import { CAMERA_MODES, getCameraModePose, type CameraMode } from "../client/src/game/systems/cameraModes";

export type CameraAcceptanceProfile = {
  mode: CameraMode;
  playerVisible: boolean;
  terrainReadable: boolean;
  touchFriendly: boolean;
  purpose: string;
};

export const CAMERA_ACCEPTANCE_PROFILES: readonly CameraAcceptanceProfile[] = [
  { mode: "overhead", playerVisible: true, terrainReadable: true, touchFriendly: true, purpose: "พื้นที่และเส้นทางรอบตัว" },
  { mode: "first-person", playerVisible: false, terrainReadable: true, touchFriendly: true, purpose: "สร้างและสำรวจใกล้ตัว" },
  { mode: "side", playerVisible: true, terrainReadable: true, touchFriendly: true, purpose: "เห็นตัวละครและความสูงของฉาก" },
];

type CameraAcceptanceIssueCode =
  | "MISSING_MODE"
  | "DUPLICATE_MODE"
  | "INVALID_POSE"
  | "INVALID_VISIBILITY"
  | "INVALID_TOUCH_INTENT"
  | "INVALID_PURPOSE";

export type CameraAcceptanceIssue = {
  code: CameraAcceptanceIssueCode;
  mode?: CameraMode;
  message: string;
};

export type CameraAcceptanceResult = {
  valid: boolean;
  profiles: readonly CameraAcceptanceProfile[];
  issues: CameraAcceptanceIssue[];
};

function validPose(mode: CameraMode) {
  const pose = getCameraModePose(mode);
  return [pose.alpha, pose.beta, pose.radius, pose.height, pose.fov].every(value => Number.isFinite(value))
    && pose.radius > 0
    && pose.height >= 0
    && pose.fov >= 0.6
    && pose.fov <= 1.2;
}

export function validateCameraAcceptanceProfiles(profiles: readonly CameraAcceptanceProfile[] = CAMERA_ACCEPTANCE_PROFILES): CameraAcceptanceResult {
  const issues: CameraAcceptanceIssue[] = [];
  const seen = new Set<CameraMode>();
  for (const profile of profiles) {
    if (seen.has(profile.mode)) {
      issues.push({ code: "DUPLICATE_MODE", mode: profile.mode, message: `camera mode ${profile.mode} is duplicated` });
      continue;
    }
    seen.add(profile.mode);
    if (!CAMERA_MODES.includes(profile.mode)) {
      issues.push({ code: "MISSING_MODE", message: `camera mode ${String(profile.mode)} is not supported` });
      continue;
    }
    if (!validPose(profile.mode)) {
      issues.push({ code: "INVALID_POSE", mode: profile.mode, message: `camera mode ${profile.mode} has an invalid bounded pose` });
    }
    if (profile.playerVisible !== (profile.mode !== "first-person") || profile.terrainReadable !== true) {
      issues.push({ code: "INVALID_VISIBILITY", mode: profile.mode, message: `camera mode ${profile.mode} must declare player visibility and terrain readability explicitly` });
    }
    if (profile.touchFriendly !== true) {
      issues.push({ code: "INVALID_TOUCH_INTENT", mode: profile.mode, message: `camera mode ${profile.mode} must remain touch-friendly` });
    }
    if (typeof profile.purpose !== "string" || profile.purpose.trim().length < 4) {
      issues.push({ code: "INVALID_PURPOSE", mode: profile.mode, message: `camera mode ${profile.mode} needs a user-facing purpose` });
    }
  }

  for (const mode of CAMERA_MODES) {
    if (!seen.has(mode)) issues.push({ code: "MISSING_MODE", mode, message: `camera mode ${mode} has no acceptance profile` });
  }
  return { valid: issues.length === 0, profiles, issues };
}
