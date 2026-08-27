import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export const CAMERA_MODES = ["overhead", "first-person", "side"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export type CameraModeOption = {
  id: CameraMode;
  value: CameraMode;
  label: string;
  shortLabel: string;
  purpose: string;
  description: string;
};

export const CAMERA_MODE_OPTIONS: readonly CameraModeOption[] = [
  { id: "overhead", value: "overhead", label: "มุมสูง / Tactical", shortLabel: "OVERHEAD", purpose: "เห็นพื้นที่ บล็อก ศัตรู และเส้นทางชัด เหมาะกับ action", description: "เห็นพื้นที่รอบตัว เหมาะกับฟาร์มและวางบล็อก" },
  { id: "first-person", value: "first-person", label: "บุคคลที่หนึ่ง / Builder", shortLabel: "FIRST PERSON", purpose: "มองจากระดับผู้เล่น เหมาะกับสร้างบ้าน ทำฟาร์ม และสำรวจใกล้ ๆ", description: "มุม action ใกล้ตัว เหมาะกับสำรวจและต่อสู้" },
  { id: "side", value: "side", label: "ด้านข้าง / Over-shoulder", shortLabel: "SIDE", purpose: "เห็นตัวละครและทิศทางด้านข้างชัด เหมาะกับเดินทางและต่อสู้", description: "เห็นตัวละครและความสูงของสิ่งปลูกสร้างชัดขึ้น" },
];

export const DEFAULT_CAMERA_MODE: CameraMode = "overhead";

export function normalizeCameraMode(value: unknown, fallback: CameraMode = DEFAULT_CAMERA_MODE): CameraMode {
  return CAMERA_MODES.includes(value as CameraMode) ? value as CameraMode : fallback;
}

export function getCameraModeOption(mode: unknown) {
  const normalized = normalizeCameraMode(mode);
  return CAMERA_MODE_OPTIONS.find(option => option.id === normalized) ?? CAMERA_MODE_OPTIONS[0]!;
}

export function getCameraModePose(mode: unknown) {
  switch (normalizeCameraMode(mode)) {
    case "first-person": return { alpha: 0, beta: Math.PI / 2, radius: 0.35, height: 1.45, fov: 0.9 };
    case "side": return { alpha: -Math.PI / 2.6, beta: Math.PI / 2.75, radius: 15, height: 1.5, fov: 0.86 };
    case "overhead":
    default: return { alpha: -Math.PI / 4, beta: Math.PI / 3.65, radius: 26, height: 0.5, fov: 0.82 };
  }
}

export function cameraRelativeMovement(mode: unknown, inputX: number, inputY: number, facingY = 0) {
  const normalized = normalizeCameraMode(mode);
  const angle = normalized === "overhead" ? -Math.PI / 4 : normalized === "side" ? 0 : facingY;
  const forward = new Vector3(Math.sin(angle), 0, Math.cos(angle));
  const right = new Vector3(Math.cos(angle), 0, -Math.sin(angle));
  return right.scale(inputX).add(forward.scale(inputY));
}

export function supportsFirstPerson(mode: unknown) {
  return normalizeCameraMode(mode) === "first-person";
}

export const VIEW_DISTANCE_BLOCKS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export type ViewDistanceBlocks = (typeof VIEW_DISTANCE_BLOCKS)[number];
export const TARGET_FPS_OPTIONS = [5, 15, 30, 45, 60, 120] as const;
export type TargetFps = (typeof TARGET_FPS_OPTIONS)[number];

export type InMapSettings = {
  cameraMode: CameraMode;
  viewDistanceBlocks: ViewDistanceBlocks;
  targetFps: TargetFps;
};

export const DEFAULT_IN_MAP_SETTINGS: InMapSettings = {
  cameraMode: "overhead",
  viewDistanceBlocks: 20,
  targetFps: 60,
};

export function normalizeInMapSettings(candidate: Partial<InMapSettings> | null | undefined): InMapSettings {
  const cameraMode = candidate?.cameraMode === "first-person" || candidate?.cameraMode === "side" ? candidate.cameraMode : DEFAULT_IN_MAP_SETTINGS.cameraMode;
  const viewDistanceBlocks = VIEW_DISTANCE_BLOCKS.includes(candidate?.viewDistanceBlocks as ViewDistanceBlocks) ? candidate!.viewDistanceBlocks as ViewDistanceBlocks : DEFAULT_IN_MAP_SETTINGS.viewDistanceBlocks;
  const targetFps = TARGET_FPS_OPTIONS.includes(candidate?.targetFps as TargetFps) ? candidate!.targetFps as TargetFps : DEFAULT_IN_MAP_SETTINGS.targetFps;
  return { cameraMode, viewDistanceBlocks, targetFps };
}

export function getCameraModeLabel(mode: CameraMode) {
  return CAMERA_MODE_OPTIONS.find(option => option.value === mode)?.label ?? "มุมสูง";
}
