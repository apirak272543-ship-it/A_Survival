import { RUNTIME_MAP_ID } from "@/game/routing/directRoute";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const BLOCK_PERSISTENCE_GENERATOR_ID = "block-persistence-audit";
export const BLOCK_PERSISTENCE_GENERATOR_VERSION = "1.0.0";
export const BLOCK_PERSISTENCE_RULES_VERSION = "b05.v1";
export const BLOCK_PERSISTENCE_MAX_SAMPLE_COUNT = 32;

export type BlockPersistenceAuditInput = {
  seed: string;
  sampleCount?: number;
};

export type PersistedWorldBlock = {
  key: string;
  blockId: string;
};

export type BlockPersistenceSources = {
  runtimeMapId: string;
  runtimeAllowedMapIds: readonly string[];
  compositeKeyFormat: "[mapId+playerId]";
  overrideKeyPattern: "integer:x:integer:y:integer:z";
  tombstoneValue: null;
  replacementValue: "module-id";
  generatedMeshesPersisted: false;
  runtimeOwnerPresent: boolean;
  storageOwnerPresent: boolean;
};

export type BlockPersistenceIssueCode =
  | "runtime-map-id-invalid"
  | "runtime-allow-list-invalid"
  | "composite-key-invalid"
  | "override-key-pattern-invalid"
  | "tombstone-semantics-missing"
  | "replacement-semantics-missing"
  | "generated-mesh-persistence-risk"
  | "runtime-owner-missing"
  | "storage-owner-missing";

export type BlockPersistenceSummary = {
  runtimeMapId: string;
  runtimeAllowedMapIds: string[];
  runtimeAllowedMapCount: number;
  runtimeWriteAllowedForCanonicalMap: boolean;
  futureMapWriteBlocked: boolean;
  compositeKeyFormat: string;
  overrideKeyPattern: string;
  tombstoneValue: null;
  replacementValue: string;
  generatedMeshesPersisted: false;
  persistedFields: string[];
  runtimeOwnerPresent: boolean;
  storageOwnerPresent: boolean;
  issueCounts: Record<string, number>;
  sourceContentHash: string;
  policy: {
    tombstoneRemovesGeneratedBlock: true;
    moduleIdRestoresOrAddsBlock: true;
    mapAndPlayerNamespaceIsRequired: true;
    onlyCanonicalRuntimeMapMayWrite: true;
    generatedMeshesNeverPersisted: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    outputIsAuditOnly: true;
  };
};

export type BlockPersistenceAudit = {
  artifact: GeneratorArtifact<BlockPersistenceAuditInput, BlockPersistenceSummary>;
  graph: DependencyGraphValidation;
  summary: BlockPersistenceSummary;
};

const COORDINATE_KEY_PATTERN = /^-?\d+:-?\d+:-?\d+$/;
const PERSISTED_FIELDS = ["mapId", "playerId", "worldBlockOverrides", "updatedAt"] as const;

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function makeArtifact(input: BlockPersistenceAuditInput, summary: BlockPersistenceSummary): GeneratorArtifact<BlockPersistenceAuditInput, BlockPersistenceSummary> {
  const artifact: GeneratorArtifact<BlockPersistenceAuditInput, BlockPersistenceSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: BLOCK_PERSISTENCE_GENERATOR_ID,
    generatorVersion: BLOCK_PERSISTENCE_GENERATOR_VERSION,
    kind: "world",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: BLOCK_PERSISTENCE_GENERATOR_ID,
      generatorVersion: BLOCK_PERSISTENCE_GENERATOR_VERSION,
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
    generatorId: BLOCK_PERSISTENCE_GENERATOR_ID,
    generatorVersion: BLOCK_PERSISTENCE_GENERATOR_VERSION,
    schemaVersion: BLOCK_PERSISTENCE_RULES_VERSION,
    seed: "b05",
    rulesVersion: BLOCK_PERSISTENCE_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: BlockPersistenceAuditInput): Required<BlockPersistenceAuditInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("B-05 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? BLOCK_PERSISTENCE_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > BLOCK_PERSISTENCE_MAX_SAMPLE_COUNT) throw new Error(`B-05 sampleCount must be an integer from 1 to ${BLOCK_PERSISTENCE_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveBlockPersistenceSources(): BlockPersistenceSources {
  return {
    runtimeMapId: RUNTIME_MAP_ID,
    runtimeAllowedMapIds: [RUNTIME_MAP_ID],
    compositeKeyFormat: "[mapId+playerId]",
    overrideKeyPattern: "integer:x:integer:y:integer:z",
    tombstoneValue: null,
    replacementValue: "module-id",
    generatedMeshesPersisted: false,
    runtimeOwnerPresent: true,
    storageOwnerPresent: true,
  };
}

export function isRuntimeBlockStateWriteAllowed(mapId: string, sources: BlockPersistenceSources = readActiveBlockPersistenceSources()) {
  return sources.runtimeAllowedMapIds.length === 1 && sources.runtimeAllowedMapIds[0] === sources.runtimeMapId && mapId === sources.runtimeMapId;
}

export function makeMapPlayerStateKey(mapId: string, playerId: string) {
  if (mapId.length === 0 || playerId.length === 0) throw new Error("B-05 mapId and playerId are required");
  return JSON.stringify([mapId, playerId]);
}

export function normalizePersistedWorldBlockOverrides(candidate: unknown): Record<string, string | null> {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return {};
  return Object.fromEntries(
    Object.entries(candidate)
      .filter(([key, value]) => COORDINATE_KEY_PATTERN.test(key) && (value === null || typeof value === "string"))
      .sort(([left], [right]) => left.localeCompare(right)),
  ) as Record<string, string | null>;
}

export function applyPersistedWorldBlockOverrides(generatedBlocks: readonly PersistedWorldBlock[], candidateOverrides: unknown): PersistedWorldBlock[] {
  const byKey = new Map(generatedBlocks.map(block => [block.key, { ...block }]));
  const overrides = normalizePersistedWorldBlockOverrides(candidateOverrides);
  for (const [key, blockId] of Object.entries(overrides)) {
    if (blockId === null) byKey.delete(key);
    else byKey.set(key, { key, blockId });
  }
  return Array.from(byKey.values()).sort((left, right) => left.key.localeCompare(right.key));
}

export function buildBlockPersistenceDependencyGraphFromSources(input: BlockPersistenceAuditInput, sources: BlockPersistenceSources): BlockPersistenceAudit {
  const normalizedInput = normalizeInput(input);
  const issueCounts: Record<string, number> = {};
  const issueCodes: BlockPersistenceIssueCode[] = [];
  const mark = (code: BlockPersistenceIssueCode) => {
    if (!issueCodes.includes(code)) issueCodes.push(code);
    increment(issueCounts, code);
  };

  if (sources.runtimeMapId !== RUNTIME_MAP_ID || sources.runtimeMapId.length === 0) mark("runtime-map-id-invalid");
  if (sources.runtimeAllowedMapIds.length !== 1 || sources.runtimeAllowedMapIds[0] !== sources.runtimeMapId) mark("runtime-allow-list-invalid");
  if (sources.compositeKeyFormat !== "[mapId+playerId]") mark("composite-key-invalid");
  if (sources.overrideKeyPattern !== "integer:x:integer:y:integer:z") mark("override-key-pattern-invalid");
  if (sources.tombstoneValue !== null) mark("tombstone-semantics-missing");
  if (sources.replacementValue !== "module-id") mark("replacement-semantics-missing");
  if (sources.generatedMeshesPersisted) mark("generated-mesh-persistence-risk");
  if (!sources.runtimeOwnerPresent) mark("runtime-owner-missing");
  if (!sources.storageOwnerPresent) mark("storage-owner-missing");

  const runtimeAllowedMapIds = Array.from(sources.runtimeAllowedMapIds);
  const summary: BlockPersistenceSummary = {
    runtimeMapId: sources.runtimeMapId,
    runtimeAllowedMapIds,
    runtimeAllowedMapCount: runtimeAllowedMapIds.length,
    runtimeWriteAllowedForCanonicalMap: isRuntimeBlockStateWriteAllowed(RUNTIME_MAP_ID, sources),
    futureMapWriteBlocked: !isRuntimeBlockStateWriteAllowed("ashen-hellscape", sources),
    compositeKeyFormat: sources.compositeKeyFormat,
    overrideKeyPattern: sources.overrideKeyPattern,
    tombstoneValue: null,
    replacementValue: sources.replacementValue,
    generatedMeshesPersisted: false,
    persistedFields: Array.from(PERSISTED_FIELDS),
    runtimeOwnerPresent: sources.runtimeOwnerPresent,
    storageOwnerPresent: sources.storageOwnerPresent,
    issueCounts,
    sourceContentHash: hashStableJson({
      runtimeMapId: sources.runtimeMapId,
      runtimeAllowedMapIds,
      compositeKeyFormat: sources.compositeKeyFormat,
      overrideKeyPattern: sources.overrideKeyPattern,
      tombstoneValue: sources.tombstoneValue,
      replacementValue: sources.replacementValue,
      generatedMeshesPersisted: sources.generatedMeshesPersisted,
      runtimeOwnerPresent: sources.runtimeOwnerPresent,
      storageOwnerPresent: sources.storageOwnerPresent,
    } as unknown as JsonValue),
    policy: {
      tombstoneRemovesGeneratedBlock: true,
      moduleIdRestoresOrAddsBlock: true,
      mapAndPlayerNamespaceIsRequired: true,
      onlyCanonicalRuntimeMapMayWrite: true,
      generatedMeshesNeverPersisted: true,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      outputIsAuditOnly: true,
    },
  };
  const sourceHash = summary.sourceContentHash;
  const policyHash = hashStableJson(summary as unknown as JsonValue);
  const nodes: DependencyGraphNode[] = [
    makeNode({ key: "block-persistence-sources:b05", kind: "world", contentHash: sourceHash }),
    makeNode({ key: "block-persistence-policy:b05", kind: "simulation", contentHash: policyHash }),
  ];
  const rootDependencies: GeneratorDependency[] = [
    { key: "block-persistence-sources:b05", kind: "world", required: true, generatorId: BLOCK_PERSISTENCE_GENERATOR_ID, generatorVersion: BLOCK_PERSISTENCE_GENERATOR_VERSION, contentHash: sourceHash },
    { key: "block-persistence-policy:b05", kind: "simulation", required: true, generatorId: BLOCK_PERSISTENCE_GENERATOR_ID, generatorVersion: BLOCK_PERSISTENCE_GENERATOR_VERSION, contentHash: policyHash },
  ];
  for (const code of issueCodes) rootDependencies.push({ key: `blocker:b05:${code}`, kind: "world", required: true });
  const root = makeNode({ key: "block-persistence:b05", kind: "world", contentHash: policyHash, dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildBlockPersistenceDependencyGraph(input: BlockPersistenceAuditInput = { seed: "block-persistence-b05" }): BlockPersistenceAudit {
  return buildBlockPersistenceDependencyGraphFromSources(input, readActiveBlockPersistenceSources());
}
