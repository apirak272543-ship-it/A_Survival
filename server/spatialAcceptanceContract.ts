import type { WorldSpatialDependencyGraphOutput, WorldSpatialPlacementAssessment } from "./generators/worldSpatialDependencyGraph";

export const EXPECTED_RUNTIME_MAP_ID = "obsidian-frontier" as const;
export const MAX_PLACEMENT_ASSESSMENTS = 12;

export type SpatialAcceptanceIssueCode =
  | "INVALID_ARTIFACT"
  | "INVALID_SUMMARY"
  | "INVALID_PLACEMENT_SAMPLE"
  | "RUNTIME_POLICY_VIOLATION"
  | "GRAPH_INVALID";

export type SpatialAcceptanceIssue = {
  code: SpatialAcceptanceIssueCode;
  message: string;
};

export type SpatialAcceptanceResult = {
  valid: boolean;
  issues: SpatialAcceptanceIssue[];
};

function validInteger(value: unknown, min?: number) {
  return typeof value === "number" && Number.isInteger(value) && Number.isFinite(value) && (min === undefined || value >= min);
}

function validatePlacementSample(sample: WorldSpatialPlacementAssessment): SpatialAcceptanceIssue[] {
  const issues: SpatialAcceptanceIssue[] = [];
  if (typeof sample.subject !== "string" || sample.subject.length === 0) issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: "placement subject must be a non-empty string" });
  if (typeof sample.accepted !== "boolean") issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: `placement ${sample.subject} must have a boolean accepted flag` });
  if (!sample.accepted && (typeof sample.reason !== "string" || sample.reason.length === 0)) issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: `rejected placement ${sample.subject} must include a reason` });
  if (sample.surface) {
    if (![sample.surface.x, sample.surface.z, sample.surface.surfaceY, sample.surface.slope, sample.surface.waterDepth].every(value => typeof value === "number" && Number.isFinite(value))) {
      issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: `placement ${sample.subject} has non-finite surface values` });
    }
    if (typeof sample.surface.biome !== "string" || sample.surface.biome.length === 0) issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: `placement ${sample.subject} surface needs a biome` });
  }
  return issues;
}

export function validateWorldSpatialAcceptance(output: WorldSpatialDependencyGraphOutput): SpatialAcceptanceResult {
  const issues: SpatialAcceptanceIssue[] = [];
  const { artifact, validation, placementAssessments, summary, graph } = output;

  if (artifact.mapId !== EXPECTED_RUNTIME_MAP_ID || !validInteger(artifact.seed) || !validInteger(artifact.radius, 8) || typeof artifact.generatorVersion !== "string" || typeof artifact.spatialRulesVersion !== "string" || !/^[a-f0-9]{64}$/.test(artifact.contentHash)) {
    issues.push({ code: "INVALID_ARTIFACT", message: "world spatial artifact must contain bounded Obsidian identity, seed/radius and SHA-256 contentHash" });
  }
  if (summary.mapId !== EXPECTED_RUNTIME_MAP_ID || !validInteger(summary.blockCount, 0) || !validInteger(summary.terrainCellCount, 0) || !validInteger(summary.waterCellCount, 0) || !validInteger(summary.structureCount, 0) || summary.placementSampleCount !== placementAssessments.length || summary.acceptedPlacementSampleCount + summary.rejectedPlacementSampleCount !== placementAssessments.length) {
    issues.push({ code: "INVALID_SUMMARY", message: "world spatial summary must match bounded generated counts and placement sample counts" });
  }
  if (placementAssessments.length < 1 || placementAssessments.length > MAX_PLACEMENT_ASSESSMENTS) issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: `placement assessments must contain between 1 and ${MAX_PLACEMENT_ASSESSMENTS} samples` });
  const subjects = new Set<string>();
  for (const sample of placementAssessments) {
    if (subjects.has(sample.subject)) issues.push({ code: "INVALID_PLACEMENT_SAMPLE", message: `placement subject ${sample.subject} is duplicated` });
    subjects.add(sample.subject);
    issues.push(...validatePlacementSample(sample));
  }
  if (summary.runtimeImportAllowed !== false || summary.playerVisible !== false || summary.cacheable !== false) issues.push({ code: "RUNTIME_POLICY_VIOLATION", message: "world spatial artifacts must remain non-importable, non-player-visible and non-cacheable" });
  if (!validation.rulesVersion || validation.issueCount < 0 || validation.errorCount < 0 || validation.repairableCount < 0 || validation.repairedCount < 0 || validation.errorCount > validation.issueCount || validation.repairableCount > validation.issueCount) issues.push({ code: "INVALID_SUMMARY", message: "validation summary counts must be bounded and internally consistent" });
  if (!graph.valid) issues.push({ code: "GRAPH_INVALID", message: "world spatial dependency graph must be valid before handoff" });

  return { valid: issues.length === 0, issues };
}
