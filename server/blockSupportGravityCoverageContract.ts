import {
  BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT,
  buildBlockSupportGravityDependencyGraph,
  type BlockSupportGravityAuditInput,
} from "./generators/blockSupportGravityDependencyGraph";

export const BLOCK_SUPPORT_GRAVITY_COVERAGE_VERSION = "0.1.0" as const;

type BlockSupportGravityCoverageBlockerCode =
  | "empty-definition-set"
  | "source-issues"
  | "invalid-dependency-graph"
  | "incomplete-sample"
  | "missing-content-hash"
  | "runtime-policy-open";

export type BlockSupportGravityCoverageBlocker = Readonly<{
  code: BlockSupportGravityCoverageBlockerCode;
  reason: string;
}>;

export type BlockSupportGravityCoverageReport = Readonly<{
  version: typeof BLOCK_SUPPORT_GRAVITY_COVERAGE_VERSION;
  source: "block-support-gravity-generator";
  input: Readonly<{
    seed: string;
    sampleCount: number;
  }>;
  coverage: Readonly<{
    definitionCount: number;
    uniqueDefinitionCount: number;
    sampledDefinitionIds: readonly string[];
    supportRequiredCount: number;
    gravityAffectedCount: number;
    floatableCount: number;
    solidSupportCount: number;
    nonSolidCount: number;
    issueCounts: Readonly<Record<string, number>>;
  }>;
  graph: Readonly<{
    valid: boolean;
    nodeCount: number;
    issueCount: number;
    topologicalOrder: readonly string[];
  }>;
  hashes: Readonly<{
    artifactContentHash: string;
    sourceContentHash: string;
  }>;
  policy: Readonly<{
    supportsOnlySolidNonNoneCollision: true;
    gravityTargetsOnlyNonFloatingDefinitions: true;
    placementRejectsUnsupportedBlocks: true;
    brokenBlocksDoNotSupport: true;
    terrainSupportCallbackIsAllowed: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    outputIsAuditOnly: true;
  }>;
  blockers: readonly BlockSupportGravityCoverageBlocker[];
  status: "complete" | "blocked";
}>;

function hasClosedPolicy(policy: BlockSupportGravityCoverageReport["policy"]): boolean {
  return policy.supportsOnlySolidNonNoneCollision
    && policy.gravityTargetsOnlyNonFloatingDefinitions
    && policy.placementRejectsUnsupportedBlocks
    && policy.brokenBlocksDoNotSupport
    && policy.terrainSupportCallbackIsAllowed
    && !policy.runtimeImportAllowed
    && !policy.playerVisible
    && !policy.cacheable
    && policy.outputIsAuditOnly;
}

/**
 * Audits the existing B-03 support/gravity generator output without changing physics or runtime state.
 */
export function auditBlockSupportGravityCoverage(
  input: BlockSupportGravityAuditInput = { seed: "block-support-gravity-b03" },
): BlockSupportGravityCoverageReport {
  const result = buildBlockSupportGravityDependencyGraph(input);
  const blockers: BlockSupportGravityCoverageBlocker[] = [];
  const { summary, graph } = result;

  if (summary.definitionCount === 0 || summary.uniqueDefinitionCount === 0) {
    blockers.push({ code: "empty-definition-set", reason: "B-03 ต้องมี block definitions ที่ตรวจ support/gravity ได้" });
  }
  if (Object.keys(summary.issueCounts).length > 0) {
    blockers.push({ code: "source-issues", reason: "B-03 source audit พบ issue ใน definition หรือ support/gravity rule" });
  }
  if (!graph.valid || graph.issues.length > 0) {
    blockers.push({ code: "invalid-dependency-graph", reason: "B-03 dependency graph ต้อง validate ผ่านและไม่มี issue" });
  }
  if (summary.sampledDefinitionIds.length !== Math.min(input.sampleCount ?? BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT, summary.uniqueDefinitionCount)) {
    blockers.push({ code: "incomplete-sample", reason: "B-03 sampled definition ids ต้องครอบคลุมตาม sampleCount ที่ขอภายในขอบเขต catalog" });
  }
  if (result.artifact.contentHash.trim().length === 0 || summary.sourceContentHash.trim().length === 0) {
    blockers.push({ code: "missing-content-hash", reason: "B-03 artifact และ source ต้องมี content hash สำหรับตรวจซ้ำ" });
  }
  if (!hasClosedPolicy(summary.policy)) {
    blockers.push({ code: "runtime-policy-open", reason: "B-03 output ต้องเป็น audit-only และปิด runtime import/player visibility/cache" });
  }

  blockers.sort((left, right) => left.code.localeCompare(right.code));
  return Object.freeze({
    version: BLOCK_SUPPORT_GRAVITY_COVERAGE_VERSION,
    source: "block-support-gravity-generator",
    input: Object.freeze({
      seed: result.artifact.input.seed,
      sampleCount: result.artifact.input.sampleCount ?? BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT,
    }),
    coverage: Object.freeze({
      definitionCount: summary.definitionCount,
      uniqueDefinitionCount: summary.uniqueDefinitionCount,
      sampledDefinitionIds: Object.freeze([...summary.sampledDefinitionIds]),
      supportRequiredCount: summary.supportRequiredCount,
      gravityAffectedCount: summary.gravityAffectedCount,
      floatableCount: summary.floatableCount,
      solidSupportCount: summary.solidSupportCount,
      nonSolidCount: summary.nonSolidCount,
      issueCounts: Object.freeze({ ...summary.issueCounts }),
    }),
    graph: Object.freeze({
      valid: graph.valid,
      nodeCount: graph.nodes.length,
      issueCount: graph.issues.length,
      topologicalOrder: Object.freeze([...graph.topologicalOrder]),
    }),
    hashes: Object.freeze({
      artifactContentHash: result.artifact.contentHash,
      sourceContentHash: summary.sourceContentHash,
    }),
    policy: Object.freeze({ ...summary.policy }),
    blockers: Object.freeze(blockers),
    status: blockers.length === 0 ? "complete" : "blocked",
  });
}
