import type { PerformanceTier } from "@/game/systems/performanceProfile";

export const DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS = 1_000;
export const DEFAULT_MAX_FRAME_SAMPLES = 120;

export type RuntimeSceneTelemetry = {
  totalMeshes: number;
  activeMeshes: number;
};

export type RuntimePerformanceTelemetrySnapshot = {
  tier: PerformanceTier;
  effectiveTargetFps: number;
  sampleWindowMs: number;
  renderedFrames: number;
  throttledFrames: number;
  averageFrameMs: number | null;
  p95FrameMs: number | null;
  worstFrameMs: number | null;
  totalMeshes: number;
  activeMeshes: number;
};

type RuntimePerformanceSamplerOptions = {
  tier: PerformanceTier;
  effectiveTargetFps: number;
  sampleWindowMs?: number;
  maxFrameSamples?: number;
};

function finiteNonNegative(value: number, fallback: number): number {
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function roundMetric(value: number): number {
  return Number(value.toFixed(2));
}

function percentile(values: number[], ratio: number): number | null {
  if (values.length === 0) return null;
  const ordered = [...values].sort((left, right) => left - right);
  const index = Math.min(ordered.length - 1, Math.max(0, Math.ceil(ordered.length * ratio) - 1));
  return roundMetric(ordered[index]);
}

export function createRuntimePerformanceSampler(options: RuntimePerformanceSamplerOptions) {
  const sampleWindowMs = Math.max(1, Math.round(finiteNonNegative(options.sampleWindowMs ?? DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS, DEFAULT_PERFORMANCE_SAMPLE_WINDOW_MS)));
  const maxFrameSamples = Math.max(1, Math.floor(finiteNonNegative(options.maxFrameSamples ?? DEFAULT_MAX_FRAME_SAMPLES, DEFAULT_MAX_FRAME_SAMPLES)));
  let tier = options.tier;
  let effectiveTargetFps = options.effectiveTargetFps;
  let windowStartedAt: number | null = null;
  let lastCallbackAt: number | null = null;
  let lastRenderedAt: number | null = null;
  let renderedFrames = 0;
  let throttledFrames = 0;
  let hasCallbacks = false;
  let frameIntervals: number[] = [];

  const normalizeNow = (now: number) => {
    const safeNow = finiteNonNegative(now, 0);
    return lastCallbackAt === null ? safeNow : Math.max(lastCallbackAt, safeNow);
  };

  const reset = (now: number) => {
    windowStartedAt = now;
    lastRenderedAt = null;
    renderedFrames = 0;
    throttledFrames = 0;
    hasCallbacks = false;
    frameIntervals = [];
  };

  return {
    setBudget(next: { tier: PerformanceTier; effectiveTargetFps: number }): void {
      tier = next.tier;
      effectiveTargetFps = next.effectiveTargetFps;
    },

    recordCallback(now: number, rendered: boolean): void {
      const safeNow = normalizeNow(now);
      if (windowStartedAt === null) windowStartedAt = safeNow;
      hasCallbacks = true;
      lastCallbackAt = safeNow;
      if (rendered) {
        renderedFrames += 1;
        if (lastRenderedAt !== null) {
          frameIntervals.push(roundMetric(Math.max(0, safeNow - lastRenderedAt)));
          if (frameIntervals.length > maxFrameSamples) frameIntervals = frameIntervals.slice(-maxFrameSamples);
        }
        lastRenderedAt = safeNow;
      } else {
        throttledFrames += 1;
      }
    },

    shouldFlush(now: number): boolean {
      if (windowStartedAt === null) return false;
      return normalizeNow(now) - windowStartedAt >= sampleWindowMs;
    },

    flush(now: number, scene: RuntimeSceneTelemetry = { totalMeshes: 0, activeMeshes: 0 }): RuntimePerformanceTelemetrySnapshot | null {
      if (windowStartedAt === null || !hasCallbacks) return null;
      const safeNow = normalizeNow(now);
      const sampleWindow = Math.max(0, safeNow - windowStartedAt);
      const snapshot: RuntimePerformanceTelemetrySnapshot = {
        tier,
        effectiveTargetFps: roundMetric(finiteNonNegative(effectiveTargetFps, 0)),
        sampleWindowMs: roundMetric(sampleWindow),
        renderedFrames,
        throttledFrames,
        averageFrameMs: frameIntervals.length > 0 ? roundMetric(frameIntervals.reduce((sum, value) => sum + value, 0) / frameIntervals.length) : null,
        p95FrameMs: percentile(frameIntervals, 0.95),
        worstFrameMs: frameIntervals.length > 0 ? roundMetric(Math.max(...frameIntervals)) : null,
        totalMeshes: Math.max(0, Math.floor(finiteNonNegative(scene.totalMeshes, 0))),
        activeMeshes: Math.max(0, Math.floor(finiteNonNegative(scene.activeMeshes, 0))),
      };
      reset(safeNow);
      lastCallbackAt = safeNow;
      return snapshot;
    },
  };
}
