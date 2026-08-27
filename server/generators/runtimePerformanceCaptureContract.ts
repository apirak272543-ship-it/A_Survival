import { hashStableJson } from "./commonGeneratorApi";
import { analyzeRuntimePerformanceSnapshot, type RuntimeProfilerInput, type RuntimeProfilerOutput, type RuntimeProfilerTier } from "./runtimePerformanceProfiler";
import type { RuntimePerformanceTelemetrySnapshot } from "../../client/src/game/systems/runtimePerformanceTelemetry";

const RUNTIME_PROFILER_TIERS = ["low", "balanced", "high"] as const satisfies readonly RuntimeProfilerTier[];

export const RUNTIME_PERFORMANCE_CAPTURE_SCHEMA_VERSION = "a-survival.runtime-performance-capture.v1" as const;
export const RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION = "1.0.0" as const;
export const RUNTIME_PERFORMANCE_CAPTURE_GENERATOR_ID = "runtime.performance.capture" as const;

export type RuntimePerformanceCaptureInput = {
  snapshot: RuntimePerformanceTelemetrySnapshot | Record<string, unknown>;
  captureId?: unknown;
  source?: unknown;
};

type CaptureIssueCode =
  | "SNAPSHOT_NORMALIZED"
  | "CAPTURE_ID_NORMALIZED"
  | "SOURCE_NORMALIZED"
  | "TIER_NORMALIZED"
  | "FPS_NORMALIZED"
  | "VIEW_DISTANCE_NORMALIZED"
  | "SAMPLE_WINDOW_NORMALIZED"
  | "FRAME_COUNT_NORMALIZED"
  | "FRAME_METRIC_NORMALIZED"
  | "MESH_COUNT_NORMALIZED"
  | "ACTIVE_MESH_CLAMPED";

type CaptureIssue = {
  code: CaptureIssueCode;
  field: string;
  detail: string;
};

type CaptureBlocker = {
  id: "controlled-capture-export" | "registry-cache-write" | "durable-profiler-history" | "real-device-benchmark";
  required: true;
  status: "missing-evidence";
  owner: string;
  reason: string;
};

export type RuntimePerformanceCaptureExport = {
  exportSchemaVersion: typeof RUNTIME_PERFORMANCE_CAPTURE_SCHEMA_VERSION;
  exportVersion: typeof RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION;
  exportOnly: true;
  artifactKey: string;
  captureId: string;
  generatorId: typeof RUNTIME_PERFORMANCE_CAPTURE_GENERATOR_ID;
  generatorVersion: typeof RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION;
  contentSha256: string;
  manifest: {
    captureKind: "runtime-performance-snapshot";
    snapshotHash: string;
    profilerVersion: string;
    files: [];
  };
  summary: {
    tier: RuntimeProfilerTier;
    effectiveTargetFps: number;
    viewDistanceBlocks: number;
    sampleWindowMs: number;
    renderedFrames: number;
    throttledFrames: number;
    observedFps: number | null;
    status: RuntimeProfilerOutput["status"];
    recommendationCodes: string[];
    normalizationIssueCount: number;
  };
  snapshot: RuntimeProfilerInput;
  profiler: RuntimeProfilerOutput;
  provenance: {
    source: "qa-runtime-snapshot" | "creator-snapshot";
    sampler: "client-runtime-performance-telemetry";
    analyzer: "server-runtime-performance-profiler";
    usage: "developer-registry-only; not automatically imported by playable runtime";
  };
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  assets: [];
  publishReady: false;
  blockers: CaptureBlocker[];
  issues: CaptureIssue[];
  claims: {
    generatorCallInRenderLoop: false;
    assetGeneration: false;
    registryWrite: false;
    cacheWrite: false;
    runtimeImport: false;
    playerVisible: false;
    adaptiveTiering: false;
    deviceBenchmark: false;
  };
};

function finiteNumber(value: unknown, fallback: number, min: number, max: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function boundedInteger(value: unknown, fallback: number, min: number, max: number) {
  return Math.floor(finiteNumber(value, fallback, min, max));
}

function nullableMetric(value: unknown) {
  if (value === null || value === undefined) return null;
  return finiteNumber(value, 0, 0, 60_000);
}

function normalizeCaptureId(value: unknown, issues: CaptureIssue[]) {
  if (typeof value === "string" && /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value)) return value;
  issues.push({ code: "CAPTURE_ID_NORMALIZED", field: "captureId", detail: "captureId must be a lowercase bounded identifier; fallback capture id was used" });
  return "runtime-snapshot";
}

function normalizeSource(value: unknown, issues: CaptureIssue[]): "qa-runtime-snapshot" | "creator-snapshot" {
  if (value === "qa-runtime-snapshot" || value === "creator-snapshot") return value;
  issues.push({ code: "SOURCE_NORMALIZED", field: "source", detail: "source must be qa-runtime-snapshot or creator-snapshot; QA source was used" });
  return "qa-runtime-snapshot";
}

function normalizeSnapshot(input: RuntimePerformanceCaptureInput["snapshot"], issues: CaptureIssue[]): RuntimeProfilerInput {
  const isRecord = Boolean(input) && typeof input === "object" && !Array.isArray(input);
  const raw = isRecord ? input as Record<string, unknown> : {};
  if (!isRecord) issues.push({ code: "SNAPSHOT_NORMALIZED", field: "snapshot", detail: "snapshot must be a non-null object; an empty snapshot was used" });
  const tierValue: RuntimeProfilerTier = typeof raw.tier === "string" && RUNTIME_PROFILER_TIERS.includes(raw.tier as RuntimeProfilerTier) ? raw.tier as RuntimeProfilerTier : "balanced";
  if (tierValue !== raw.tier) issues.push({ code: "TIER_NORMALIZED", field: "tier", detail: "tier was normalized to a supported performance tier" });
  const effectiveTargetFps = boundedInteger(raw.effectiveTargetFps, 60, 1, 240);
  if (effectiveTargetFps !== raw.effectiveTargetFps) issues.push({ code: "FPS_NORMALIZED", field: "effectiveTargetFps", detail: "effective target FPS was bounded to 1–240" });
  const viewDistanceBlocks = boundedInteger(raw.viewDistanceBlocks, 20, 0, 500);
  if (viewDistanceBlocks !== raw.viewDistanceBlocks) issues.push({ code: "VIEW_DISTANCE_NORMALIZED", field: "viewDistanceBlocks", detail: "view distance was bounded to 0–500 blocks" });
  const sampleWindowMs = boundedInteger(raw.sampleWindowMs, 0, 0, 60_000);
  if (sampleWindowMs !== raw.sampleWindowMs) issues.push({ code: "SAMPLE_WINDOW_NORMALIZED", field: "sampleWindowMs", detail: "sample window was bounded to 0–60000ms" });
  const renderedFrames = boundedInteger(raw.renderedFrames, 0, 0, 100_000);
  const throttledFrames = boundedInteger(raw.throttledFrames, 0, 0, 100_000);
  if (renderedFrames !== raw.renderedFrames || throttledFrames !== raw.throttledFrames) issues.push({ code: "FRAME_COUNT_NORMALIZED", field: "frameCounts", detail: "frame counts were bounded to non-negative integers" });
  const averageFrameMs = nullableMetric(raw.averageFrameMs);
  const p95FrameMs = nullableMetric(raw.p95FrameMs);
  const worstFrameMs = nullableMetric(raw.worstFrameMs);
  if (averageFrameMs !== raw.averageFrameMs || p95FrameMs !== raw.p95FrameMs || worstFrameMs !== raw.worstFrameMs) issues.push({ code: "FRAME_METRIC_NORMALIZED", field: "frameMetrics", detail: "frame metrics were normalized to finite non-negative values or null" });
  const totalMeshes = boundedInteger(raw.totalMeshes, 0, 0, 1_000_000);
  const requestedActiveMeshes = boundedInteger(raw.activeMeshes, 0, 0, 1_000_000);
  const activeMeshes = Math.min(totalMeshes, requestedActiveMeshes);
  if (totalMeshes !== raw.totalMeshes || requestedActiveMeshes !== raw.activeMeshes) issues.push({ code: "MESH_COUNT_NORMALIZED", field: "meshCounts", detail: "mesh counts were bounded to non-negative integers" });
  if (activeMeshes !== requestedActiveMeshes) issues.push({ code: "ACTIVE_MESH_CLAMPED", field: "activeMeshes", detail: "active meshes were clamped to total meshes" });
  return { tier: tierValue, effectiveTargetFps, viewDistanceBlocks, sampleWindowMs, renderedFrames, throttledFrames, averageFrameMs, p95FrameMs, worstFrameMs, totalMeshes, activeMeshes };
}

function buildBlockers(): CaptureBlocker[] {
  return [
    {
      id: "controlled-capture-export",
      required: true,
      status: "missing-evidence",
      owner: "runtime profiler capture/export owner",
      reason: "this checkpoint exports a deterministic in-memory metadata shape but does not run a controlled browser capture or download flow",
    },
    {
      id: "registry-cache-write",
      required: true,
      status: "missing-evidence",
      owner: "creator domain artifact registry/cache owner",
      reason: "the contract does not register to the database or write a runtime/cache artifact",
    },
    {
      id: "durable-profiler-history",
      required: true,
      status: "missing-evidence",
      owner: "runtime profiler history owner",
      reason: "snapshots remain caller-provided and are not persisted as a durable history",
    },
    {
      id: "real-device-benchmark",
      required: true,
      status: "missing-evidence",
      owner: "performance validation owner",
      reason: "no CPU/GPU/FPS/memory/thermal/device benchmark is generated or inferred",
    },
  ];
}

export function buildRuntimePerformanceCaptureExport(input: RuntimePerformanceCaptureInput): RuntimePerformanceCaptureExport {
  const issues: CaptureIssue[] = [];
  const captureId = normalizeCaptureId(input.captureId, issues);
  const source = normalizeSource(input.source, issues);
  const snapshot = normalizeSnapshot(input.snapshot, issues);
  const profiler = analyzeRuntimePerformanceSnapshot(snapshot);
  const snapshotHash = hashStableJson(snapshot as never);
  const blockers = buildBlockers();
  const summary: RuntimePerformanceCaptureExport["summary"] = {
    tier: snapshot.tier,
    effectiveTargetFps: snapshot.effectiveTargetFps,
    viewDistanceBlocks: snapshot.viewDistanceBlocks,
    sampleWindowMs: snapshot.sampleWindowMs,
    renderedFrames: snapshot.renderedFrames,
    throttledFrames: snapshot.throttledFrames,
    observedFps: profiler.observedFps,
    status: profiler.status,
    recommendationCodes: profiler.recommendations.map(recommendation => recommendation.code),
    normalizationIssueCount: issues.length,
  };
  const canonicalPayload = {
    exportSchemaVersion: RUNTIME_PERFORMANCE_CAPTURE_SCHEMA_VERSION,
    exportVersion: RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION,
    exportOnly: true,
    captureId,
    generatorId: RUNTIME_PERFORMANCE_CAPTURE_GENERATOR_ID,
    generatorVersion: RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION,
    manifest: { captureKind: "runtime-performance-snapshot", snapshotHash, profilerVersion: profiler.profilerVersion, files: [] },
    summary,
    snapshot,
    profiler,
    provenance: { source, sampler: "client-runtime-performance-telemetry", analyzer: "server-runtime-performance-profiler", usage: "developer-registry-only; not automatically imported by playable runtime" },
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    assets: [],
    publishReady: false,
    blockers,
    issues,
  };
  const contentSha256 = hashStableJson(canonicalPayload as never);
  return {
    exportSchemaVersion: RUNTIME_PERFORMANCE_CAPTURE_SCHEMA_VERSION,
    exportVersion: RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION,
    exportOnly: true,
    artifactKey: `profiler:${captureId}:${contentSha256}`,
    captureId,
    generatorId: RUNTIME_PERFORMANCE_CAPTURE_GENERATOR_ID,
    generatorVersion: RUNTIME_PERFORMANCE_CAPTURE_EXPORT_VERSION,
    contentSha256,
    manifest: { captureKind: "runtime-performance-snapshot", snapshotHash, profilerVersion: profiler.profilerVersion, files: [] },
    summary,
    snapshot,
    profiler,
    provenance: { source, sampler: "client-runtime-performance-telemetry", analyzer: "server-runtime-performance-profiler", usage: "developer-registry-only; not automatically imported by playable runtime" },
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    assets: [],
    publishReady: false,
    blockers,
    issues,
    claims: { generatorCallInRenderLoop: false, assetGeneration: false, registryWrite: false, cacheWrite: false, runtimeImport: false, playerVisible: false, adaptiveTiering: false, deviceBenchmark: false },
  };
}
