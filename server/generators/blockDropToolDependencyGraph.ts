import { ALL_ITEMS, BLOCK_ITEM_DEFINITIONS, type ItemDefinition } from "@/game/data/catalog";
import { OBSIDIAN_BLOCKS, type BlockDefinition, type BlockToolTag, type WorldBlock } from "@/game/data/blockModules";
import { resolveBlockBreak } from "@/game/systems/blockActionSystem";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const BLOCK_DROP_TOOL_GENERATOR_ID = "block-drop-tool-audit";
export const BLOCK_DROP_TOOL_GENERATOR_VERSION = "1.0.0";
export const BLOCK_DROP_TOOL_RULES_VERSION = "b04.v1";
export const BLOCK_DROP_TOOL_MAX_SAMPLE_COUNT = 32;

export type BlockDropToolAuditInput = {
  seed: string;
  sampleCount?: number;
};

export type BlockDropToolSources = {
  definitions: readonly BlockDefinition[];
  blockItems: readonly ItemDefinition[];
  toolItems: readonly ItemDefinition[];
  runtimeOwnerPresent: boolean;
  durabilityOwnerPresent: boolean;
};

export type BlockDropToolIssueCode =
  | "definition-id-missing"
  | "duplicate-definition-id"
  | "required-tool-invalid"
  | "tool-tag-uncovered"
  | "block-item-missing"
  | "block-item-not-placeable"
  | "block-item-placement-mismatch"
  | "block-item-stack-invalid"
  | "drop-quantity-invalid"
  | "correct-tool-drop-missing"
  | "wrong-tool-drop-leak"
  | "runtime-owner-missing"
  | "durability-owner-missing";

export type BlockDropToolSummary = {
  definitionCount: number;
  uniqueDefinitionCount: number;
  sampledDefinitionIds: string[];
  blockItemLinkCount: number;
  toolAwarePlaceableDropCount: number;
  correctToolDropVerifiedCount: number;
  wrongToolNoDropVerifiedCount: number;
  toolTagCount: number;
  toolTags: BlockToolTag[];
  runtimeOwnerPresent: boolean;
  durabilityOwnerPresent: boolean;
  issueCounts: Record<string, number>;
  sourceContentHash: string;
  policy: {
    wrongToolProducesNoBlockDrop: true;
    correctToolProducesOnlyCanonicalBlockItem: true;
    dropQuantityMustBePositiveInteger: true;
    placeableBlockStackLimitIs64: true;
    toolDurabilityIsNotInvented: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    outputIsAuditOnly: true;
  };
};

export type BlockDropToolAudit = {
  artifact: GeneratorArtifact<BlockDropToolAuditInput, BlockDropToolSummary>;
  graph: DependencyGraphValidation;
  summary: BlockDropToolSummary;
};

const TOOL_TAGS: readonly BlockToolTag[] = ["pickaxe", "axe", "shears"];

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function fakeWorldBlock(definition: BlockDefinition): WorldBlock {
  return {
    key: "0:0:0",
    blockId: definition.id,
    moduleId: definition.id,
    x: 0,
    y: 0,
    z: 0,
    state: "intact",
    hitPoints: Math.max(1, definition.hardness),
    maxHitPoints: Math.max(1, definition.hardness),
    solid: definition.solid,
    seed: 0,
  };
}

function makeArtifact(input: BlockDropToolAuditInput, summary: BlockDropToolSummary): GeneratorArtifact<BlockDropToolAuditInput, BlockDropToolSummary> {
  const artifact: GeneratorArtifact<BlockDropToolAuditInput, BlockDropToolSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: BLOCK_DROP_TOOL_GENERATOR_ID,
    generatorVersion: BLOCK_DROP_TOOL_GENERATOR_VERSION,
    kind: "item",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: BLOCK_DROP_TOOL_GENERATOR_ID,
      generatorVersion: BLOCK_DROP_TOOL_GENERATOR_VERSION,
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
    generatorId: BLOCK_DROP_TOOL_GENERATOR_ID,
    generatorVersion: BLOCK_DROP_TOOL_GENERATOR_VERSION,
    schemaVersion: BLOCK_DROP_TOOL_RULES_VERSION,
    seed: "b04",
    rulesVersion: BLOCK_DROP_TOOL_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: BlockDropToolAuditInput): Required<BlockDropToolAuditInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("B-04 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? BLOCK_DROP_TOOL_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > BLOCK_DROP_TOOL_MAX_SAMPLE_COUNT) throw new Error(`B-04 sampleCount must be an integer from 1 to ${BLOCK_DROP_TOOL_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveBlockDropToolSources(): BlockDropToolSources {
  return {
    definitions: Object.values(OBSIDIAN_BLOCKS),
    blockItems: BLOCK_ITEM_DEFINITIONS,
    toolItems: ALL_ITEMS.filter(item => item.category === "tool"),
    runtimeOwnerPresent: true,
    durabilityOwnerPresent: false,
  };
}

export function buildBlockDropToolDependencyGraphFromSources(input: BlockDropToolAuditInput, sources: BlockDropToolSources): BlockDropToolAudit {
  const normalizedInput = normalizeInput(input);
  const definitions = Array.from(sources.definitions);
  const blockItems = Array.from(sources.blockItems);
  const toolItems = Array.from(sources.toolItems);
  const definitionIds = definitions.map(definition => definition.id);
  const uniqueDefinitionIds = new Set(definitionIds);
  const blockItemById = new Map(blockItems.map(item => [item.id, item]));
  const issueCounts: Record<string, number> = {};
  const issueCodes: BlockDropToolIssueCode[] = [];
  const mark = (code: BlockDropToolIssueCode) => {
    if (!issueCodes.includes(code)) issueCodes.push(code);
    increment(issueCounts, code);
  };

  if (definitions.some(definition => typeof definition.id !== "string" || definition.id.length === 0)) mark("definition-id-missing");
  if (uniqueDefinitionIds.size !== definitionIds.length) mark("duplicate-definition-id");
  for (const definition of definitions) {
    if (definition.requiredToolTag && !TOOL_TAGS.includes(definition.requiredToolTag)) mark("required-tool-invalid");
    if (definition.requiredToolTag && !toolItems.some(item => item.toolTag === definition.requiredToolTag)) mark("tool-tag-uncovered");
    if (definition.blockItemDefinitionId) {
      const item = blockItemById.get(definition.blockItemDefinitionId);
      if (!item) {
        mark("block-item-missing");
      } else {
        if (!item.isBlockItem) mark("block-item-not-placeable");
        if (item.placementBlockId !== definition.id) mark("block-item-placement-mismatch");
        if (item.stackLimit !== 64) mark("block-item-stack-invalid");
      }
      if (!Number.isInteger(definition.dropQuantity) || definition.dropQuantity < 1) mark("drop-quantity-invalid");
      if (definition.dropQuantity > (item?.stackLimit ?? 0)) mark("drop-quantity-invalid");
    }
  }

  const toolAwarePlaceableDefinitions = definitions.filter(definition => Boolean(definition.requiredToolTag && definition.blockItemDefinitionId));
  let correctToolDropVerifiedCount = 0;
  let wrongToolNoDropVerifiedCount = 0;
  for (const definition of toolAwarePlaceableDefinitions) {
    const block = fakeWorldBlock(definition);
    const correct = resolveBlockBreak(block, definition.requiredToolTag);
    if (correct.dropKind !== "block-item" || correct.dropDefinitionId !== definition.blockItemDefinitionId || correct.dropQuantity !== definition.dropQuantity || !correct.usedCorrectTool) mark("correct-tool-drop-missing");
    else correctToolDropVerifiedCount += 1;
    const wrongTags = TOOL_TAGS.filter(tag => tag !== definition.requiredToolTag);
    const wrongResults = wrongTags.map(tag => resolveBlockBreak(block, tag));
    if (wrongResults.some(result => result.dropKind !== "none" || result.dropQuantity !== 0 || result.usedCorrectTool)) mark("wrong-tool-drop-leak");
    else wrongToolNoDropVerifiedCount += 1;
  }
  if (!sources.runtimeOwnerPresent) mark("runtime-owner-missing");
  if (!sources.durabilityOwnerPresent) mark("durability-owner-missing");

  const summary: BlockDropToolSummary = {
    definitionCount: definitions.length,
    uniqueDefinitionCount: uniqueDefinitionIds.size,
    sampledDefinitionIds: Array.from(uniqueDefinitionIds).sort().slice(0, normalizedInput.sampleCount),
    blockItemLinkCount: definitions.filter(definition => Boolean(definition.blockItemDefinitionId)).length,
    toolAwarePlaceableDropCount: toolAwarePlaceableDefinitions.length,
    correctToolDropVerifiedCount,
    wrongToolNoDropVerifiedCount,
    toolTagCount: TOOL_TAGS.filter(tag => toolItems.some(item => item.toolTag === tag)).length,
    toolTags: Array.from(TOOL_TAGS).filter(tag => toolItems.some(item => item.toolTag === tag)),
    runtimeOwnerPresent: sources.runtimeOwnerPresent,
    durabilityOwnerPresent: sources.durabilityOwnerPresent,
    issueCounts,
    sourceContentHash: hashStableJson({
      definitions,
      blockItems,
      toolItems,
      runtimeOwnerPresent: sources.runtimeOwnerPresent,
      durabilityOwnerPresent: sources.durabilityOwnerPresent,
    } as unknown as JsonValue),
    policy: {
      wrongToolProducesNoBlockDrop: true,
      correctToolProducesOnlyCanonicalBlockItem: true,
      dropQuantityMustBePositiveInteger: true,
      placeableBlockStackLimitIs64: true,
      toolDurabilityIsNotInvented: true,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      outputIsAuditOnly: true,
    },
  };
  const sourceHash = summary.sourceContentHash;
  const policyHash = hashStableJson(summary as unknown as JsonValue);
  const nodes: DependencyGraphNode[] = [
    makeNode({ key: "block-drop-definitions:b04", kind: "world", contentHash: sourceHash }),
    makeNode({ key: "block-drop-policy:b04", kind: "item", contentHash: policyHash }),
  ];
  const rootDependencies: GeneratorDependency[] = [
    { key: "block-drop-definitions:b04", kind: "world", required: true, generatorId: BLOCK_DROP_TOOL_GENERATOR_ID, generatorVersion: BLOCK_DROP_TOOL_GENERATOR_VERSION, contentHash: sourceHash },
    { key: "block-drop-policy:b04", kind: "item", required: true, generatorId: BLOCK_DROP_TOOL_GENERATOR_ID, generatorVersion: BLOCK_DROP_TOOL_GENERATOR_VERSION, contentHash: policyHash },
  ];
  for (const code of issueCodes) rootDependencies.push({ key: `blocker:b04:${code}`, kind: "item", required: true });
  const root = makeNode({ key: "block-drop-tool:b04", kind: "item", contentHash: policyHash, dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildBlockDropToolDependencyGraph(input: BlockDropToolAuditInput = { seed: "block-drop-tool-b04" }): BlockDropToolAudit {
  return buildBlockDropToolDependencyGraphFromSources(input, readActiveBlockDropToolSources());
}
