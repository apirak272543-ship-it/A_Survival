import type { PerformanceTier } from "./performanceProfile";

export const RUNTIME_CAPABILITY_SCHEMA = "a-survival.runtime-capability.v1" as const;

export type RuntimeCapabilityInput = {
  webgl?: unknown;
  webgl2?: unknown;
  webgpu?: unknown;
  hardwareConcurrency?: unknown;
  deviceMemoryGb?: unknown;
  storageQuotaGb?: unknown;
  maxTouchPoints?: unknown;
  viewportWidth?: unknown;
  viewportHeight?: unknown;
};

export type RuntimeCapabilitySnapshot = {
  schemaVersion: typeof RUNTIME_CAPABILITY_SCHEMA;
  webgl: boolean;
  webgl2: boolean;
  webgpu: boolean;
  hardwareConcurrency: number | null;
  deviceMemoryGb: number | null;
  storageQuotaGb: number | null;
  maxTouchPoints: number;
  viewportWidth: number | null;
  viewportHeight: number | null;
};

export type RuntimeCapabilityAdvice = {
  snapshot: RuntimeCapabilitySnapshot;
  recommendedTier: PerformanceTier;
  confidence: "conservative" | "heuristic";
  reasons: Array<{
    code: "WEBGL_MISSING" | "WEBGL2_MISSING" | "LOW_CPU" | "LOW_MEMORY" | "HIGH_CAPABILITY" | "BASELINE";
    detail: string;
  }>;
  claims: {
    oneTimeProbe: true;
    deviceBenchmark: false;
    adaptiveTiering: false;
    autoApplied: false;
    renderLoopCoupled: false;
    networkPersistence: false;
  };
};

function finiteNumber(value: unknown, minimum = 0, maximum = 1_000_000): number | null {
  if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) return null;
  return Math.min(maximum, value);
}

function integerOrNull(value: unknown, minimum = 1, maximum = 128): number | null {
  const normalized = finiteNumber(value, minimum, maximum);
  return normalized === null ? null : Math.floor(normalized);
}

function viewportOrNull(value: unknown): number | null {
  const normalized = finiteNumber(value, 1, 100_000);
  return normalized === null ? null : Math.floor(normalized);
}

export function normalizeRuntimeCapabilitySnapshot(input: RuntimeCapabilityInput): RuntimeCapabilitySnapshot {
  return {
    schemaVersion: RUNTIME_CAPABILITY_SCHEMA,
    webgl: input.webgl === true,
    webgl2: input.webgl2 === true,
    webgpu: input.webgpu === true,
    hardwareConcurrency: integerOrNull(input.hardwareConcurrency),
    deviceMemoryGb: finiteNumber(input.deviceMemoryGb, 0.25, 1_024),
    storageQuotaGb: finiteNumber(input.storageQuotaGb, 0.001, 1_000_000),
    maxTouchPoints: integerOrNull(input.maxTouchPoints, 0, 32) ?? 0,
    viewportWidth: viewportOrNull(input.viewportWidth),
    viewportHeight: viewportOrNull(input.viewportHeight),
  };
}

/**
 * Produces an advisory tier from a single normalized capability snapshot.
 * This is intentionally not a benchmark and never mutates settings or runtime.
 */
export function advisePerformanceTier(input: RuntimeCapabilityInput | RuntimeCapabilitySnapshot): RuntimeCapabilityAdvice {
  const snapshot = "schemaVersion" in input
    ? input
    : normalizeRuntimeCapabilitySnapshot(input);
  const reasons: RuntimeCapabilityAdvice["reasons"] = [];
  let recommendedTier: PerformanceTier = "balanced";
  let confidence: RuntimeCapabilityAdvice["confidence"] = "conservative";

  if (!snapshot.webgl) {
    recommendedTier = "low";
    reasons.push({ code: "WEBGL_MISSING", detail: "ไม่พบ WebGL ที่ตรวจได้ จึงแนะนำโปรไฟล์ประหยัดเป็นค่า fail-closed" });
  } else if (!snapshot.webgl2) {
    recommendedTier = "low";
    reasons.push({ code: "WEBGL2_MISSING", detail: "ไม่พบ WebGL2 ที่ตรวจได้ จึงลดคำแนะนำเพื่อหลีกเลี่ยงภาระกราฟิกเกินจำเป็น" });
  } else if ((snapshot.hardwareConcurrency !== null && snapshot.hardwareConcurrency < 4) || (snapshot.deviceMemoryGb !== null && snapshot.deviceMemoryGb < 2)) {
    recommendedTier = "low";
    if (snapshot.hardwareConcurrency !== null && snapshot.hardwareConcurrency < 4) reasons.push({ code: "LOW_CPU", detail: "จำนวน logical processors ต่ำกว่า baseline 4" });
    if (snapshot.deviceMemoryGb !== null && snapshot.deviceMemoryGb < 2) reasons.push({ code: "LOW_MEMORY", detail: "หน่วยความจำอุปกรณ์ต่ำกว่า baseline 2 GB" });
  } else if (snapshot.webgpu && snapshot.hardwareConcurrency !== null && snapshot.hardwareConcurrency >= 8 && snapshot.deviceMemoryGb !== null && snapshot.deviceMemoryGb >= 8) {
    recommendedTier = "high";
    confidence = "heuristic";
    reasons.push({ code: "HIGH_CAPABILITY", detail: "พบ WebGPU, CPU อย่างน้อย 8 logical processors และ memory อย่างน้อย 8 GB จึงแนะนำคุณภาพสูงแบบ heuristic" });
  } else {
    reasons.push({ code: "BASELINE", detail: "ความสามารถอยู่ใน baseline ที่ใช้โปรไฟล์สมดุล โดยข้อมูลนี้ยังไม่ใช่ผล benchmark" });
  }

  return {
    snapshot,
    recommendedTier,
    confidence,
    reasons,
    claims: {
      oneTimeProbe: true,
      deviceBenchmark: false,
      adaptiveTiering: false,
      autoApplied: false,
      renderLoopCoupled: false,
      networkPersistence: false,
    },
  };
}
