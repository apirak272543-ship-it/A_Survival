import {
  buildWorldSpatialDependencyGraph,
  getDefaultWorldSpatialDependencyGraphInput,
  type WorldSpatialDependencyGraphInput,
} from "./generators/worldSpatialDependencyGraph";

export const WORLD_SPATIAL_COVERAGE_VERSION = "0.1.0" as const;

const EXPECTED_GENERATOR_IDS = ["world.generator", "world.spatial"] as const;

type WorldSpatialCoverageBlockerCode =
  | "invalid-generated-world"
  | "invalid-dependency-graph"
  | "missing-placement-proof"
  | "artifact-hash-missing"
  | "runtime-policy-open";

export type WorldSpatialCoverageBlocker = Readonly<{
  code: WorldSpatialCoverageBlockerCode;
  reason: string;
}>;

export type WorldSpatialCoverageReport = Readonly<{
  version: typeof WORLD_SPATIAL_COVERAGE_VERSION;
  source: "world-spatial-dependency-graph";
  input: Readonly<{
    seed: number;
    radius: number;
    placementSubjects: readonly string[];
  }>;
  artifact: Readonly<{
    mapId: string;
    seed: number;
    radius: number;
    generatorVersion: string;
    spatialRulesVersion: string;
    contentHash: string;
  }>;
  validation: Readonly<{
    valid: boolean;
    issueCount: number;
    errorCount: number;
    repairableCount: number;
    repairedCount: number;
    issueCodes: readonly string[];
  }>;
  placement: Readonly<{
    sampleCount: number;
    acceptedCount: number;
    rejectedCount: number;
    rejectedSubjects: readonly string[];
  }>;
  graph: Readonly<{
    valid: boolean;
    nodeCount: number;
    generatorIds: readonly string[];
    topologicalOrder: readonly string[];
  }>;
  blockers: readonly WorldSpatialCoverageBlocker[];
  status: "complete" | "blocked";
  policy: Readonly<{
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    persistenceWrite: false;
  }>;
}>;

function hasExpectedRuntimePolicy(policy: { runtimeImportAllowed: false; playerVisible: false; cacheable: false }): boolean {
  return policy.runtimeImportAllowed === false && policy.playerVisible === false && policy.cacheable === false;
}

/**
 * Audits the existing bounded world-spatial graph without generating a new artifact,
 * mutating the runtime, or opening future-map import/cache/persistence paths.
 */
export function auditWorldSpatialCoverage(
  input: WorldSpatialDependencyGraphInput = getDefaultWorldSpatialDependencyGraphInput(),
): WorldSpatialCoverageReport {
  const result = buildWorldSpatialDependencyGraph(input);
  const blockers: WorldSpatialCoverageBlocker[] = [];
  const placementSubjects = result.placementAssessments.map(assessment => assessment.subject);
  const generatorIds = result.nodes.map(node => node.generatorId);

  if (!result.validation.valid || result.validation.errorCount > 0) {
    blockers.push({ code: "invalid-generated-world", reason: "generated world validation มี error หรือไม่ผ่านก่อน export" });
  }
  if (!result.graph.valid || result.nodes.length !== EXPECTED_GENERATOR_IDS.length || !EXPECTED_GENERATOR_IDS.every(id => generatorIds.includes(id))) {
    blockers.push({ code: "invalid-dependency-graph", reason: "world generator และ spatial validator ต้องอยู่ใน dependency graph ที่ validate ผ่าน" });
  }
  if (result.placementAssessments.length === 0) {
    blockers.push({ code: "missing-placement-proof", reason: "ต้องมี placement assessment อย่างน้อยหนึ่ง subject เพื่อยืนยัน spatial boundary" });
  }
  if (result.artifact.contentHash.trim().length === 0) {
    blockers.push({ code: "artifact-hash-missing", reason: "generated artifact ต้องมี content hash ที่ตรวจซ้ำได้" });
  }
  if (!hasExpectedRuntimePolicy(result.graph.runtimePolicy) || result.summary.runtimeImportAllowed || result.summary.playerVisible || result.summary.cacheable) {
    blockers.push({ code: "runtime-policy-open", reason: "spatial preview ต้องปิด runtime import, player visibility และ cacheability" });
  }

  blockers.sort((left, right) => left.code.localeCompare(right.code));
  const rejectedSubjects = result.placementAssessments
    .filter(assessment => !assessment.accepted)
    .map(assessment => assessment.subject)
    .sort((left, right) => left.localeCompare(right));

  return Object.freeze({
    version: WORLD_SPATIAL_COVERAGE_VERSION,
    source: "world-spatial-dependency-graph",
    input: Object.freeze({
      seed: result.artifact.seed,
      radius: result.artifact.radius,
      placementSubjects: Object.freeze([...placementSubjects]),
    }),
    artifact: Object.freeze({ ...result.artifact }),
    validation: Object.freeze({
      valid: result.validation.valid,
      issueCount: result.validation.issueCount,
      errorCount: result.validation.errorCount,
      repairableCount: result.validation.repairableCount,
      repairedCount: result.validation.repairedCount,
      issueCodes: Object.freeze([...result.validation.issueCodes]),
    }),
    placement: Object.freeze({
      sampleCount: result.placementAssessments.length,
      acceptedCount: result.summary.acceptedPlacementSampleCount,
      rejectedCount: result.summary.rejectedPlacementSampleCount,
      rejectedSubjects: Object.freeze(rejectedSubjects),
    }),
    graph: Object.freeze({
      valid: result.graph.valid,
      nodeCount: result.nodes.length,
      generatorIds: Object.freeze([...generatorIds]),
      topologicalOrder: Object.freeze([...result.graph.topologicalOrder]),
    }),
    blockers: Object.freeze(blockers),
    status: blockers.length === 0 ? "complete" : "blocked",
    policy: Object.freeze({
      runtimeImportAllowed: false as const,
      playerVisible: false as const,
      cacheable: false as const,
      persistenceWrite: false as const,
    }),
  });
}
