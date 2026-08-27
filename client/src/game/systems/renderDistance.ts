export type RenderDistancePreset = "near" | "balanced" | "far";
export const VIEW_DISTANCE_BLOCK_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
export type ViewDistanceBlocks = (typeof VIEW_DISTANCE_BLOCK_STEPS)[number];
export const TARGET_FPS_OPTIONS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 120] as const;
export type TargetFps = (typeof TARGET_FPS_OPTIONS)[number];

export function normalizeViewDistanceBlocks(value: unknown, fallback: ViewDistanceBlocks = 25): ViewDistanceBlocks {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return VIEW_DISTANCE_BLOCK_STEPS.reduce((closest, candidate) => Math.abs(candidate - numeric) < Math.abs(closest - numeric) ? candidate : closest, fallback);
}

export function normalizeTargetFps(value: unknown, fallback: TargetFps = 60): TargetFps {
  const numeric = typeof value === "number" && Number.isFinite(value) ? value : fallback;
  return TARGET_FPS_OPTIONS.reduce((closest, candidate) => Math.abs(candidate - numeric) < Math.abs(closest - numeric) ? candidate : closest, fallback);
}

export function getBlockRenderDistanceConfig(blocks: unknown, mapRadiusMeters = 500): RenderDistanceConfig {
  const visibleRadiusBlocks = Math.min(mapRadiusMeters, normalizeViewDistanceBlocks(blocks));
  const prefetchRadiusBlocks = Math.min(mapRadiusMeters, visibleRadiusBlocks + Math.max(5, Math.round(visibleRadiusBlocks * 0.35)));
  return {
    preset: visibleRadiusBlocks <= 15 ? "near" : visibleRadiusBlocks <= 35 ? "balanced" : "far",
    visibleRadiusMeters: visibleRadiusBlocks,
    prefetchRadiusMeters: prefetchRadiusBlocks,
    label: `${visibleRadiusBlocks} blocks`,
  };
}

export type RenderDistanceConfig = {
  preset: RenderDistancePreset;
  visibleRadiusMeters: number;
  prefetchRadiusMeters: number;
  label: string;
  visibleRadiusBlocks?: number;
};

export const RENDER_DISTANCE_PRESETS: Record<RenderDistancePreset, RenderDistanceConfig> = {
  near: { preset: "near", visibleRadiusMeters: 64, prefetchRadiusMeters: 96, label: "Near · battery saver" },
  balanced: { preset: "balanced", visibleRadiusMeters: 96, prefetchRadiusMeters: 128, label: "Balanced · recommended" },
  far: { preset: "far", visibleRadiusMeters: 128, prefetchRadiusMeters: 160, label: "Far · stronger devices" },
};

export function getRenderDistanceConfig(preset: RenderDistancePreset | undefined, viewDistanceBlocks?: unknown, mapRadiusMeters = 500): RenderDistanceConfig {
  if (viewDistanceBlocks !== undefined) return getBlockRenderDistanceConfig(viewDistanceBlocks, mapRadiusMeters);
  const config = RENDER_DISTANCE_PRESETS[preset ?? "balanced"] ?? RENDER_DISTANCE_PRESETS.balanced;
  return { ...config, visibleRadiusBlocks: config.visibleRadiusMeters };
}
