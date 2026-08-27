import type { RuntimePerformanceTelemetrySnapshot } from "../client/src/game/systems/runtimePerformanceTelemetry";

export const MAX_SAMPLE_WINDOW_MS = 60_000;
export const MAX_FRAME_COUNT = 100_000;

export type LoadTelemetryIssueCode =
  | "INVALID_TARGET_FPS"
  | "INVALID_SAMPLE_WINDOW"
  | "INVALID_FRAME_COUNTS"
  | "INVALID_FRAME_METRICS"
  | "INVALID_MESH_COUNTS";

export type LoadTelemetryIssue = {
  code: LoadTelemetryIssueCode;
  message: string;
};

export type LoadTelemetryResult = {
  valid: boolean;
  issues: LoadTelemetryIssue[];
  activeMeshRatio: number | null;
  frameBudgetMs: number | null;
};

function finiteNonNegative(value: number) {
  return Number.isFinite(value) && value >= 0;
}

export function validateLoadTelemetry(snapshot: RuntimePerformanceTelemetrySnapshot): LoadTelemetryResult {
  const issues: LoadTelemetryIssue[] = [];
  const targetFps = snapshot.effectiveTargetFps;
  const frameBudgetMs = targetFps > 0 ? Number((1000 / targetFps).toFixed(2)) : null;
  const activeMeshRatio = snapshot.totalMeshes > 0 ? Number((snapshot.activeMeshes / snapshot.totalMeshes).toFixed(4)) : null;

  if (!Number.isFinite(targetFps) || targetFps < 5 || targetFps > 120) issues.push({ code: "INVALID_TARGET_FPS", message: "effective target FPS must be between 5 and 120" });
  if (!Number.isFinite(snapshot.sampleWindowMs) || snapshot.sampleWindowMs < 0 || snapshot.sampleWindowMs > MAX_SAMPLE_WINDOW_MS) issues.push({ code: "INVALID_SAMPLE_WINDOW", message: `sample window must be between 0 and ${MAX_SAMPLE_WINDOW_MS} ms` });
  if (!Number.isInteger(snapshot.renderedFrames) || snapshot.renderedFrames < 0 || snapshot.renderedFrames > MAX_FRAME_COUNT || !Number.isInteger(snapshot.throttledFrames) || snapshot.throttledFrames < 0 || snapshot.throttledFrames > MAX_FRAME_COUNT) {
    issues.push({ code: "INVALID_FRAME_COUNTS", message: `rendered/throttled frame counts must be integers between 0 and ${MAX_FRAME_COUNT}` });
  }
  if (snapshot.averageFrameMs !== null && !finiteNonNegative(snapshot.averageFrameMs)) issues.push({ code: "INVALID_FRAME_METRICS", message: "average frame time must be null or non-negative" });
  if (snapshot.p95FrameMs !== null && !finiteNonNegative(snapshot.p95FrameMs)) issues.push({ code: "INVALID_FRAME_METRICS", message: "p95 frame time must be null or non-negative" });
  if (snapshot.worstFrameMs !== null && !finiteNonNegative(snapshot.worstFrameMs)) issues.push({ code: "INVALID_FRAME_METRICS", message: "worst frame time must be null or non-negative" });
  if (snapshot.p95FrameMs !== null && snapshot.worstFrameMs !== null && snapshot.p95FrameMs > snapshot.worstFrameMs) issues.push({ code: "INVALID_FRAME_METRICS", message: "p95 frame time cannot exceed worst frame time" });
  if (!Number.isInteger(snapshot.totalMeshes) || snapshot.totalMeshes < 0 || !Number.isInteger(snapshot.activeMeshes) || snapshot.activeMeshes < 0 || snapshot.activeMeshes > snapshot.totalMeshes) issues.push({ code: "INVALID_MESH_COUNTS", message: "active mesh count must be an integer between 0 and total mesh count" });

  return { valid: issues.length === 0, issues, activeMeshRatio, frameBudgetMs };
}
