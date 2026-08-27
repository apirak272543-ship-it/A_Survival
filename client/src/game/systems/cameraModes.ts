import { Vector3 } from "@babylonjs/core/Maths/math.vector";

export const CAMERA_MODES = ["overhead", "first-person", "side"] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export type CameraModeOption = {
  id: CameraMode;
  label: string;
  shortLabel: string;
  purpose: string;
};

export const CAMERA_MODE_OPTIONS: readonly CameraModeOption[] = [
  { id: "overhead", label: "มุมสูง / Tactical", shortLabel: "OVERHEAD", purpose: "เห็นพื้นที่ บล็อก ศัตรู และเส้นทางชัด เหมาะกับ action" },
  { id: "first-person", label: "บุคคลที่หนึ่ง / Builder", shortLabel: "FIRST PERSON", purpose: "มองจากระดับผู้เล่น เหมาะกับสร้างบ้าน ทำฟาร์ม และสำรวจใกล้ ๆ" },
  { id: "side", label: "ด้านข้าง / Over-shoulder", shortLabel: "SIDE", purpose: "เห็นตัวละครและทิศทางด้านข้างชัด เหมาะกับเดินทางและต่อสู้" },
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
