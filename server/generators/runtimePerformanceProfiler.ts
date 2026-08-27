export const RUNTIME_PROFILER_VERSION = "0.1.0";

export type RuntimeProfilerTier = "low" | "balanced" | "high";

export type RuntimeProfilerInput = {
  tier: RuntimeProfilerTier;
  effectiveTargetFps: number;
  viewDistanceBlocks: number;
  sampleWindowMs: number;
  renderedFrames: number;
  throttledFrames: number;
  averageFrameMs: number | null;
  p95FrameMs: number | null;
  worstFrameMs: number | null;
  totalMeshes: number;
  activeMeshes: number;
};

export type RuntimeProfilerOutput = {
  profilerVersion: string;
  previewOnly: true;
  tier: RuntimeProfilerTier;
  effectiveTargetFps: number;
  viewDistanceBlocks: number;
  observedFps: number | null;
  targetFrameMs: number;
  activeMeshRatio: number | null;
  status: "no-sample" | "watch" | "action";
  recommendations: Array<{
    code: "NO_RENDER_SAMPLE" | "FRAME_CADENCE" | "ACTIVE_MESH_RATIO" | "THROTTLED_CALLBACKS" | "OBSERVATION_ONLY";
    title: string;
    detail: string;
  }>;
  claims: {
    deviceBenchmark: false;
    adaptiveTiering: false;
    playerRuntimeMutation: false;
    networkPersistence: false;
  };
};

const finiteNonNegative = (value: number, fallback = 0) => Number.isFinite(value) && value >= 0 ? value : fallback;
const roundMetric = (value: number) => Math.round(value * 100) / 100;

export function analyzeRuntimePerformanceSnapshot(input: RuntimeProfilerInput): RuntimeProfilerOutput {
  const effectiveTargetFps = Math.max(1, roundMetric(finiteNonNegative(input.effectiveTargetFps, 60)));
  const viewDistanceBlocks = Math.max(0, roundMetric(finiteNonNegative(input.viewDistanceBlocks, 20)));
  const sampleWindowMs = finiteNonNegative(input.sampleWindowMs);
  const renderedFrames = Math.floor(finiteNonNegative(input.renderedFrames));
  const throttledFrames = Math.floor(finiteNonNegative(input.throttledFrames));
  const totalMeshes = Math.floor(finiteNonNegative(input.totalMeshes));
  const activeMeshes = Math.min(totalMeshes, Math.floor(finiteNonNegative(input.activeMeshes)));
  const targetFrameMs = roundMetric(1000 / effectiveTargetFps);
  const observedFps = sampleWindowMs > 0 && renderedFrames > 0 ? roundMetric((renderedFrames * 1000) / sampleWindowMs) : null;
  const activeMeshRatio = totalMeshes > 0 ? roundMetric(activeMeshes / totalMeshes) : null;
  const p95FrameMs = input.p95FrameMs === null ? null : roundMetric(finiteNonNegative(input.p95FrameMs));
  const averageFrameMs = input.averageFrameMs === null ? null : roundMetric(finiteNonNegative(input.averageFrameMs));
  const worstFrameMs = input.worstFrameMs === null ? null : roundMetric(finiteNonNegative(input.worstFrameMs));
  const recommendations: RuntimeProfilerOutput["recommendations"] = [];
  let status: RuntimeProfilerOutput["status"] = "no-sample";

  if (observedFps === null) {
    recommendations.push({ code: "NO_RENDER_SAMPLE", title: "ยังไม่มีตัวอย่าง frame ที่ใช้วิเคราะห์ได้", detail: "เก็บ telemetry window ที่มี rendered frame ก่อนสรุป cadence" });
  } else {
    status = "watch";
    const cadenceReference = p95FrameMs ?? averageFrameMs ?? worstFrameMs;
    if (cadenceReference !== null && cadenceReference > targetFrameMs * 1.25) {
      status = cadenceReference > targetFrameMs * 1.75 ? "action" : "watch";
      recommendations.push({ code: "FRAME_CADENCE", title: "ตรวจ frame cadence และลดภาระฉาก", detail: `p95/average frame สูงกว่า budget ${targetFrameMs}ms ของ tier ${input.tier}; ตรวจ view distance, active mesh และงานต่อ frame เพิ่ม` });
    }
  }

  if (activeMeshRatio !== null && activeMeshRatio > 0.75) {
    if (activeMeshRatio > 0.9) status = "action";
    recommendations.push({ code: "ACTIVE_MESH_RATIO", title: "ตรวจ spatial visibility เพิ่ม", detail: `active mesh ratio อยู่ที่ ${roundMetric(activeMeshRatio * 100)}%; ตรวจ distance/frustum/LOD policy ก่อนเพิ่ม asset หรือ effect` });
  }

  if (throttledFrames > 0) {
    recommendations.push({ code: "THROTTLED_CALLBACKS", title: "มี callback ที่ถูก throttle", detail: `${throttledFrames} callback อยู่เหนือ effective target; ตรวจว่าการลด FPS เป็น policy ที่ตั้งใจ ไม่ใช่ main-thread stall` });
  }

  recommendations.push({ code: "OBSERVATION_ONLY", title: "ผลนี้เป็น preview จาก snapshot", detail: "ไม่ใช่การวัด CPU/GPU จริง ไม่เปลี่ยน tier อัตโนมัติ ไม่เขียน save/network และไม่เปลี่ยน player runtime" });

  return {
    profilerVersion: RUNTIME_PROFILER_VERSION,
    previewOnly: true,
    tier: input.tier,
    effectiveTargetFps,
    viewDistanceBlocks,
    observedFps,
    targetFrameMs,
    activeMeshRatio,
    status,
    recommendations,
    claims: {
      deviceBenchmark: false,
      adaptiveTiering: false,
      playerRuntimeMutation: false,
      networkPersistence: false,
    },
  };
}
