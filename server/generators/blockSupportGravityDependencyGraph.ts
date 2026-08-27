import { OBSIDIAN_BLOCKS, type BlockDefinition } from "@/game/data/blockModules";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const BLOCK_SUPPORT_GRAVITY_GENERATOR_ID = "block-support-gravity-audit";
export const BLOCK_SUPPORT_GRAVITY_GENERATOR_VERSION = "1.0.0";
export const BLOCK_SUPPORT_GRAVITY_RULES_VERSION = "b03.v1";
export const BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT = 32;

export type BlockSupportGravityAuditInput = {
  seed: string;
  sampleCount?: number;
};

export type BlockSupportGravitySources = {
  definitions: Readonly<Record<string, BlockDefinition>>;
  adjacentOffsets: readonly { dx: number; dy: number; dz: number }[];
  supportPredicate: "solid-non-none-collision";
  brokenStateExcluded: boolean;
  terrainSupportCallbackAllowed: boolean;
  placementRejectReason: "requires-support";
  runtimeOwnerPresent: boolean;
};

export type BlockSupportGravityIssueCode =
  | "definition-id-mismatch"
  | "duplicate-definition-id"
  | "missing-support-fields"
  | "support-predicate-invalid"
  | "adjacency-invalid"
  | "broken-state-not-excluded"
  | "terrain-callback-missing"
  | "placement-reason-invalid"
  | "gravity-float-contradiction"
  | "gravity-support-rule-missing"
  | "runtime-owner-missing";

export type BlockSupportGravitySummary = {
  definitionCount: number;
  uniqueDefinitionCount: number;
  sampledDefinitionIds: string[];
  supportRequiredCount: number;
  gravityAffectedCount: number;
  floatableCount: number;
  solidSupportCount: number;
  nonSolidCount: number;
  brokenStateExcluded: boolean;
  adjacentOffsets: Array<{ dx: number; dy: number; dz: number }>;
  supportPredicate: string;
  terrainSupportCallbackAllowed: boolean;
  placementRejectReason: string;
  runtimeOwnerPresent: boolean;
  issueCounts: Record<string, number>;
  sourceContentHash: string;
  policy: {
    supportsOnlySolidNonNoneCollision: true;
    gravityTargetsOnlyNonFloatingDefinitions: true;
    placementRejectsUnsupportedBlocks: true;
    brokenBlocksDoNotSupport: true;
    terrainSupportCallbackIsAllowed: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    outputIsAuditOnly: true;
  };
};

export type BlockSupportGravityAudit = {
  artifact: GeneratorArtifact<BlockSupportGravityAuditInput, BlockSupportGravitySummary>;
  graph: DependencyGraphValidation;
  summary: BlockSupportGravitySummary;
};

const EXPECTED_ADJACENT_OFFSETS = [
  { dx: 0, dy: -1, dz: 0 },
  { dx: 1, dy: 0, dz: 0 },
  { dx: -1, dy: 0, dz: 0 },
  { dx: 0, dy: 0, dz: 1 },
  { dx: 0, dy: 0, dz: -1 },
  { dx: 0, dy: 1, dz: 0 },
] as const;

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function sameOffsets(left: readonly { dx: number; dy: number; dz: number }[], right: readonly { dx: number; dy: number; dz: number }[]) {
  return left.length === right.length && right.every((expected, index) => {
    const actual = left[index];
    return actual?.dx === expected.dx && actual?.dy === expected.dy && actual?.dz === expected.dz;
  });
}

function makeArtifact(input: BlockSupportGravityAuditInput, summary: BlockSupportGravitySummary): GeneratorArtifact<BlockSupportGravityAuditInput, BlockSupportGravitySummary> {
  const artifact: GeneratorArtifact<BlockSupportGravityAuditInput, BlockSupportGravitySummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: BLOCK_SUPPORT_GRAVITY_GENERATOR_ID,
    generatorVersion: BLOCK_SUPPORT_GRAVITY_GENERATOR_VERSION,
    kind: "world",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: BLOCK_SUPPORT_GRAVITY_GENERATOR_ID,
      generatorVersion: BLOCK_SUPPORT_GRAVITY_GENERATOR_VERSION,
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
    generatorId: BLOCK_SUPPORT_GRAVITY_GENERATOR_ID,
    generatorVersion: BLOCK_SUPPORT_GRAVITY_GENERATOR_VERSION,
    schemaVersion: BLOCK_SUPPORT_GRAVITY_RULES_VERSION,
    seed: "b03",
    rulesVersion: BLOCK_SUPPORT_GRAVITY_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: BlockSupportGravityAuditInput): Required<BlockSupportGravityAuditInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("B-03 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT) throw new Error(`B-03 sampleCount must be an integer from 1 to ${BLOCK_SUPPORT_GRAVITY_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveBlockSupportGravitySources(): BlockSupportGravitySources {
  return {
    definitions: OBSIDIAN_BLOCKS,
    adjacentOffsets: Array.from(EXPECTED_ADJACENT_OFFSETS),
    supportPredicate: "solid-non-none-collision",
    brokenStateExcluded: true,
    terrainSupportCallbackAllowed: true,
    placementRejectReason: "requires-support",
    runtimeOwnerPresent: true,
  };
}

export function buildBlockSupportGravityDependencyGraphFromSources(input: BlockSupportGravityAuditInput, sources: BlockSupportGravitySources): BlockSupportGravityAudit {
  const normalizedInput = normalizeInput(input);
  const entries = Object.entries(sources.definitions);
  const definitionIds = entries.map(([key, definition]) => definition.id || key);
  const uniqueDefinitionIds = new Set(definitionIds);
  const issueCounts: Record<string, number> = {};
  const issueCodes: BlockSupportGravityIssueCode[] = [];
  const duplicateIds = definitionIds.filter((id, index) => definitionIds.indexOf(id) !== index);

  if (entries.some(([key, definition]) => key !== definition.id)) {
    issueCodes.push("definition-id-mismatch");
    increment(issueCounts, "definition-id-mismatch");
  }
  if (duplicateIds.length > 0) {
    issueCodes.push("duplicate-definition-id");
    increment(issueCounts, "duplicate-definition-id");
  }
  if (entries.some(([, definition]) => typeof definition.requiresSupport !== "boolean" || typeof definition.gravityAffected !== "boolean" || typeof definition.canFloat !== "boolean")) {
    issueCodes.push("missing-support-fields");
    increment(issueCounts, "missing-support-fields");
  }
  if (sources.supportPredicate !== "solid-non-none-collision") {
    issueCodes.push("support-predicate-invalid");
    increment(issueCounts, "support-predicate-invalid");
  }
  if (!sameOffsets(sources.adjacentOffsets, EXPECTED_ADJACENT_OFFSETS)) {
    issueCodes.push("adjacency-invalid");
    increment(issueCounts, "adjacency-invalid");
  }
  if (!sources.brokenStateExcluded) {
    issueCodes.push("broken-state-not-excluded");
    increment(issueCounts, "broken-state-not-excluded");
  }
  if (!sources.terrainSupportCallbackAllowed) {
    issueCodes.push("terrain-callback-missing");
    increment(issueCounts, "terrain-callback-missing");
  }
  if (sources.placementRejectReason !== "requires-support") {
    issueCodes.push("placement-reason-invalid");
    increment(issueCounts, "placement-reason-invalid");
  }
  if (entries.some(([, definition]) => definition.gravityAffected && definition.canFloat)) {
    issueCodes.push("gravity-float-contradiction");
    increment(issueCounts, "gravity-float-contradiction");
  }
  if (entries.some(([, definition]) => definition.gravityAffected && !definition.requiresSupport)) {
    issueCodes.push("gravity-support-rule-missing");
    increment(issueCounts, "gravity-support-rule-missing");
  }
  if (!sources.runtimeOwnerPresent) {
    issueCodes.push("runtime-owner-missing");
    increment(issueCounts, "runtime-owner-missing");
  }

  const supportRequiredCount = entries.filter(([, definition]) => definition.requiresSupport).length;
  const gravityAffectedCount = entries.filter(([, definition]) => definition.gravityAffected).length;
  const floatableCount = entries.filter(([, definition]) => definition.canFloat).length;
  const solidSupportCount = entries.filter(([, definition]) => definition.solid && definition.collisionShape !== "none").length;
  const summary: BlockSupportGravitySummary = {
    definitionCount: entries.length,
    uniqueDefinitionCount: uniqueDefinitionIds.size,
    sampledDefinitionIds: Array.from(uniqueDefinitionIds).sort().slice(0, normalizedInput.sampleCount),
    supportRequiredCount,
    gravityAffectedCount,
    floatableCount,
    solidSupportCount,
    nonSolidCount: entries.length - solidSupportCount,
    brokenStateExcluded: sources.brokenStateExcluded,
    adjacentOffsets: Array.from(sources.adjacentOffsets).map(offset => ({ ...offset })),
    supportPredicate: sources.supportPredicate,
    terrainSupportCallbackAllowed: sources.terrainSupportCallbackAllowed,
    placementRejectReason: sources.placementRejectReason,
    runtimeOwnerPresent: sources.runtimeOwnerPresent,
    issueCounts,
    sourceContentHash: hashStableJson({
      definitions: entries.map(([key, definition]) => ({ key, ...definition })).sort((left, right) => left.key.localeCompare(right.key)),
      adjacentOffsets: sources.adjacentOffsets,
      supportPredicate: sources.supportPredicate,
      brokenStateExcluded: sources.brokenStateExcluded,
      terrainSupportCallbackAllowed: sources.terrainSupportCallbackAllowed,
      placementRejectReason: sources.placementRejectReason,
      runtimeOwnerPresent: sources.runtimeOwnerPresent,
    } as unknown as JsonValue),
    policy: {
      supportsOnlySolidNonNoneCollision: true,
      gravityTargetsOnlyNonFloatingDefinitions: true,
      placementRejectsUnsupportedBlocks: true,
      brokenBlocksDoNotSupport: true,
      terrainSupportCallbackIsAllowed: true,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      outputIsAuditOnly: true,
    },
  };
  const sourceHash = summary.sourceContentHash;
  const policyHash = hashStableJson(summary as unknown as JsonValue);
  const nodes: DependencyGraphNode[] = [
    makeNode({ key: "block-definitions:b03", kind: "world", contentHash: sourceHash }),
    makeNode({ key: "block-support-policy:b03", kind: "world", contentHash: policyHash }),
  ];
  const rootDependencies: GeneratorDependency[] = [
    { key: "block-definitions:b03", kind: "world", required: true, generatorId: BLOCK_SUPPORT_GRAVITY_GENERATOR_ID, generatorVersion: BLOCK_SUPPORT_GRAVITY_GENERATOR_VERSION, contentHash: sourceHash },
    { key: "block-support-policy:b03", kind: "world", required: true, generatorId: BLOCK_SUPPORT_GRAVITY_GENERATOR_ID, generatorVersion: BLOCK_SUPPORT_GRAVITY_GENERATOR_VERSION, contentHash: policyHash },
  ];
  for (const code of issueCodes) rootDependencies.push({ key: `blocker:b03:${code}`, kind: "world", required: true });
  const root = makeNode({ key: "block-support-gravity:b03", kind: "world", contentHash: policyHash, dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildBlockSupportGravityDependencyGraph(input: BlockSupportGravityAuditInput = { seed: "block-support-gravity-b03" }): BlockSupportGravityAudit {
  return buildBlockSupportGravityDependencyGraphFromSources(input, readActiveBlockSupportGravitySources());
}
