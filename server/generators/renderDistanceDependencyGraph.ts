import { getBlockRenderDistanceConfig, normalizeTargetFps, normalizeViewDistanceBlocks, TARGET_FPS_OPTIONS, VIEW_DISTANCE_BLOCK_STEPS } from "@/game/systems/renderDistance";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const RENDER_DISTANCE_AUDIT_GENERATOR_ID = "render-distance-audit";
export const RENDER_DISTANCE_AUDIT_GENERATOR_VERSION = "1.0.0";
export const RENDER_DISTANCE_AUDIT_RULES_VERSION = "s03.v1";
export const RENDER_DISTANCE_AUDIT_MAX_SAMPLE_COUNT = 32;

export type RenderDistanceAuditInput = {
  seed: string;
  sampleCount?: number;
};

export type RenderDistanceAuditSources = {
  viewDistanceSteps: readonly number[];
  targetFpsOptions: readonly number[];
  defaultViewDistanceBlocks: number;
  defaultTargetFps: number;
  persistenceOwnerPresent: boolean;
  streamingPolicyExplicit: boolean;
  highRefreshDisclaimerPresent: boolean;
};

export type RenderDistanceIssueCode =
  | "view-distance-range"
  | "view-distance-step"
  | "target-fps-range"
  | "target-fps-shape"
  | "high-refresh-disclaimer-missing"
  | "default-view-distance-invalid"
  | "default-target-fps-invalid"
  | "persistence-owner-missing"
  | "streaming-policy-missing";

export type RenderDistanceAuditSummary = {
  viewDistanceSteps: number[];
  targetFpsOptions: number[];
  viewDistanceMin: number;
  viewDistanceMax: number;
  viewDistanceStep: number;
  lowTargetFpsMin: number;
  lowTargetFpsMax: number;
  highRefreshTargetFps: number | null;
  defaultViewDistanceBlocks: number;
  defaultTargetFps: number;
  persistenceOwnerPresent: boolean;
  streamingPolicyExplicit: boolean;
  highRefreshDisclaimerPresent: boolean;
  normalizationProof: {
    invalidViewDistanceFallsBackTo25: boolean;
    invalidTargetFpsFallsBackTo60: boolean;
    nearViewDistanceNormalizesTo5: boolean;
    nearTargetFpsNormalizesTo5: boolean;
    highTargetFpsNormalizesTo120: boolean;
  };
  issueCounts: Record<string, number>;
  policy: {
    allowedViewDistanceRange: "5–50 blocks";
    allowedViewDistanceStep: 5;
    allowedTargetFpsRange: "5–60 plus 120 disclaimer";
    highRefreshIsAdvisoryOnly: true;
    persistenceIsNotWrittenByAudit: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    outputIsAuditOnly: true;
  };
  sourceContentHash: string;
};

export type RenderDistanceAudit = {
  artifact: GeneratorArtifact<RenderDistanceAuditInput, RenderDistanceAuditSummary>;
  graph: DependencyGraphValidation;
  summary: RenderDistanceAuditSummary;
};

const EXPECTED_VIEW_DISTANCE_STEPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50] as const;
const EXPECTED_LOW_TARGET_FPS = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60] as const;
const EXPECTED_HIGH_REFRESH_FPS = 120;

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function sameNumbers(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function makeArtifact(input: RenderDistanceAuditInput, summary: RenderDistanceAuditSummary): GeneratorArtifact<RenderDistanceAuditInput, RenderDistanceAuditSummary> {
  const artifact: GeneratorArtifact<RenderDistanceAuditInput, RenderDistanceAuditSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: RENDER_DISTANCE_AUDIT_GENERATOR_ID,
    generatorVersion: RENDER_DISTANCE_AUDIT_GENERATOR_VERSION,
    kind: "other",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: RENDER_DISTANCE_AUDIT_GENERATOR_ID,
      generatorVersion: RENDER_DISTANCE_AUDIT_GENERATOR_VERSION,
      seed: input.seed,
      source: "backend-generator",
      generatedAt: 0,
    },
  };
  artifact.contentHash = calculateGeneratorContentHash(artifact);
  return artifact;
}

function makeNode(input: { key: string; kind: GeneratorKind; contentHash: string; dependencies?: GeneratorDependency[] }): DependencyGraphNode {
  return {
    key: input.key,
    kind: input.kind,
    generatorId: RENDER_DISTANCE_AUDIT_GENERATOR_ID,
    generatorVersion: RENDER_DISTANCE_AUDIT_GENERATOR_VERSION,
    schemaVersion: RENDER_DISTANCE_AUDIT_RULES_VERSION,
    seed: "s03",
    rulesVersion: RENDER_DISTANCE_AUDIT_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: RenderDistanceAuditInput): Required<RenderDistanceAuditInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("S-03 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? RENDER_DISTANCE_AUDIT_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > RENDER_DISTANCE_AUDIT_MAX_SAMPLE_COUNT) throw new Error(`S-03 sampleCount must be an integer from 1 to ${RENDER_DISTANCE_AUDIT_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveRenderDistanceAuditSources(): RenderDistanceAuditSources {
  return {
    viewDistanceSteps: Array.from(VIEW_DISTANCE_BLOCK_STEPS),
    targetFpsOptions: Array.from(TARGET_FPS_OPTIONS),
    defaultViewDistanceBlocks: normalizeViewDistanceBlocks(undefined),
    defaultTargetFps: normalizeTargetFps(undefined),
    persistenceOwnerPresent: true,
    streamingPolicyExplicit: true,
    highRefreshDisclaimerPresent: false,
  };
}

export function buildRenderDistanceDependencyGraphFromSources(input: RenderDistanceAuditInput, sources: RenderDistanceAuditSources): RenderDistanceAudit {
  const normalizedInput = normalizeInput(input);
  const viewDistanceSteps = Array.from(sources.viewDistanceSteps);
  const targetFpsOptions = Array.from(sources.targetFpsOptions);
  const issueCounts: Record<string, number> = {};
  const issueCodes: RenderDistanceIssueCode[] = [];
  const viewDistanceMin = viewDistanceSteps.length > 0 ? Math.min(...viewDistanceSteps) : 0;
  const viewDistanceMax = viewDistanceSteps.length > 0 ? Math.max(...viewDistanceSteps) : 0;
  const viewDistanceStep = viewDistanceSteps.length > 1 ? viewDistanceSteps[1]! - viewDistanceSteps[0]! : 0;
  const lowTargetFpsOptions = targetFpsOptions.filter(value => value <= 60);
  const highRefreshTargetFps = targetFpsOptions.includes(EXPECTED_HIGH_REFRESH_FPS) ? EXPECTED_HIGH_REFRESH_FPS : null;

  if (!sameNumbers(viewDistanceSteps, EXPECTED_VIEW_DISTANCE_STEPS)) issueCodes.push("view-distance-range");
  if (viewDistanceSteps.some((value, index) => index > 0 && value - viewDistanceSteps[index - 1]! !== 5)) issueCodes.push("view-distance-step");
  if (!sameNumbers(lowTargetFpsOptions, EXPECTED_LOW_TARGET_FPS)) issueCodes.push("target-fps-range");
  if (highRefreshTargetFps === null) issueCodes.push("target-fps-shape");
  if (!sources.highRefreshDisclaimerPresent) issueCodes.push("high-refresh-disclaimer-missing");
  if (!EXPECTED_VIEW_DISTANCE_STEPS.includes(sources.defaultViewDistanceBlocks as (typeof EXPECTED_VIEW_DISTANCE_STEPS)[number])) issueCodes.push("default-view-distance-invalid");
  if (!EXPECTED_LOW_TARGET_FPS.includes(sources.defaultTargetFps as (typeof EXPECTED_LOW_TARGET_FPS)[number]) && sources.defaultTargetFps !== EXPECTED_HIGH_REFRESH_FPS) issueCodes.push("default-target-fps-invalid");
  if (!sources.persistenceOwnerPresent) issueCodes.push("persistence-owner-missing");
  if (!sources.streamingPolicyExplicit) issueCodes.push("streaming-policy-missing");
  for (const code of issueCodes) increment(issueCounts, code);

  const summary: RenderDistanceAuditSummary = {
    viewDistanceSteps,
    targetFpsOptions,
    viewDistanceMin,
    viewDistanceMax,
    viewDistanceStep,
    lowTargetFpsMin: lowTargetFpsOptions.length > 0 ? Math.min(...lowTargetFpsOptions) : 0,
    lowTargetFpsMax: lowTargetFpsOptions.length > 0 ? Math.max(...lowTargetFpsOptions) : 0,
    highRefreshTargetFps,
    defaultViewDistanceBlocks: sources.defaultViewDistanceBlocks,
    defaultTargetFps: sources.defaultTargetFps,
    persistenceOwnerPresent: sources.persistenceOwnerPresent,
    streamingPolicyExplicit: sources.streamingPolicyExplicit,
    highRefreshDisclaimerPresent: sources.highRefreshDisclaimerPresent,
    normalizationProof: {
      invalidViewDistanceFallsBackTo25: normalizeViewDistanceBlocks(undefined) === 25,
      invalidTargetFpsFallsBackTo60: normalizeTargetFps(undefined) === 60,
      nearViewDistanceNormalizesTo5: normalizeViewDistanceBlocks(1) === 5,
      nearTargetFpsNormalizesTo5: normalizeTargetFps(1) === 5,
      highTargetFpsNormalizesTo120: normalizeTargetFps(119) === 120,
    },
    issueCounts,
    policy: {
      allowedViewDistanceRange: "5–50 blocks",
      allowedViewDistanceStep: 5,
      allowedTargetFpsRange: "5–60 plus 120 disclaimer",
      highRefreshIsAdvisoryOnly: true,
      persistenceIsNotWrittenByAudit: true,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      outputIsAuditOnly: true,
    },
    sourceContentHash: hashStableJson({
      viewDistanceSteps,
      targetFpsOptions,
      defaultViewDistanceBlocks: sources.defaultViewDistanceBlocks,
      defaultTargetFps: sources.defaultTargetFps,
      persistenceOwnerPresent: sources.persistenceOwnerPresent,
      streamingPolicyExplicit: sources.streamingPolicyExplicit,
      highRefreshDisclaimerPresent: sources.highRefreshDisclaimerPresent,
    } as unknown as JsonValue),
  };
  const sourceHash = summary.sourceContentHash;
  const nodes: DependencyGraphNode[] = [
    makeNode({ key: "render-distance-options:s03", kind: "other", contentHash: sourceHash }),
    makeNode({ key: "render-distance-policy:s03", kind: "other", contentHash: hashStableJson(summary as unknown as JsonValue) }),
  ];
  const rootDependencies: GeneratorDependency[] = [
    { key: "render-distance-options:s03", kind: "other", required: true, generatorId: RENDER_DISTANCE_AUDIT_GENERATOR_ID, generatorVersion: RENDER_DISTANCE_AUDIT_GENERATOR_VERSION, contentHash: sourceHash },
    { key: "render-distance-policy:s03", kind: "other", required: true, generatorId: RENDER_DISTANCE_AUDIT_GENERATOR_ID, generatorVersion: RENDER_DISTANCE_AUDIT_GENERATOR_VERSION, contentHash: hashStableJson(summary as unknown as JsonValue) },
  ];
  for (const code of issueCodes) rootDependencies.push({ key: `blocker:s03:${code}`, kind: "other", required: true });
  const root = makeNode({ key: "render-distance:s03", kind: "other", contentHash: hashStableJson(summary as unknown as JsonValue), dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildRenderDistanceDependencyGraph(input: RenderDistanceAuditInput = { seed: "render-distance-s03" }): RenderDistanceAudit {
  return buildRenderDistanceDependencyGraphFromSources(input, readActiveRenderDistanceAuditSources());
}
