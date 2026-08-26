export type CameraMode = "first-person" | "overhead" | "side";

export const CAMERA_MODE_OPTIONS: ReadonlyArray<{ value: CameraMode; label: string; description: string }> = [
  { value: "first-person", label: "บุคคลที่ 1", description: "มุม action ใกล้ตัว เหมาะกับสำรวจและต่อสู้" },
  { value: "overhead", label: "มุมสูง", description: "เห็นพื้นที่รอบตัว เหมาะกับฟาร์มและวางบล็อก" },
  { value: "side", label: "มุมด้านข้าง", description: "เห็นตัวละครและความสูงของสิ่งปลูกสร้างชัดขึ้น" },
];

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
