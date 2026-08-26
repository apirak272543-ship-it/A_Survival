export type RenderDistancePreset = "near" | "balanced" | "far";

export type RenderDistanceConfig = {
  preset: RenderDistancePreset;
  visibleRadiusMeters: number;
  prefetchRadiusMeters: number;
  label: string;
};

export const RENDER_DISTANCE_PRESETS: Record<RenderDistancePreset, RenderDistanceConfig> = {
  near: { preset: "near", visibleRadiusMeters: 64, prefetchRadiusMeters: 96, label: "Near · battery saver" },
  balanced: { preset: "balanced", visibleRadiusMeters: 96, prefetchRadiusMeters: 128, label: "Balanced · recommended" },
  far: { preset: "far", visibleRadiusMeters: 128, prefetchRadiusMeters: 160, label: "Far · stronger devices" },
};

export function getRenderDistanceConfig(preset: RenderDistancePreset | undefined): RenderDistanceConfig {
  return RENDER_DISTANCE_PRESETS[preset ?? "balanced"] ?? RENDER_DISTANCE_PRESETS.balanced;
}
