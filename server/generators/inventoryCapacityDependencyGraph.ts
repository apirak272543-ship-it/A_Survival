import { BLOCK_ITEM_DEFINITIONS, getItemDefinition, type ItemDefinition, type ItemInstance } from "@/game/data/catalog";
import { addItemToContainer, PLAYER_INVENTORY_SLOTS, WORLD_STORAGE_DEFAULT_SLOTS } from "@/game/systems/inventorySystem";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const INVENTORY_CAPACITY_GENERATOR_ID = "inventory-capacity-audit";
export const INVENTORY_CAPACITY_GENERATOR_VERSION = "1.0.0";
export const INVENTORY_CAPACITY_RULES_VERSION = "b06.v1";
export const INVENTORY_CAPACITY_MAX_SAMPLE_COUNT = 32;

export type InventoryCapacityAuditInput = {
  seed: string;
  sampleCount?: number;
};

export type InventoryCapacitySources = {
  playerSlotCapacity: number;
  worldStorageSlotCapacity: number;
  normalBlockStackLimit: number;
  blockItems: readonly ItemDefinition[];
  inventoryOwnerPresent: boolean;
  capacityArgumentOwnerPresent: boolean;
  crossMapCarryOwnerPresent: boolean;
};

export type InventoryCapacityIssueCode =
  | "player-slot-cap-invalid"
  | "world-storage-slot-cap-invalid"
  | "block-stack-cap-invalid"
  | "block-stack-definition-missing"
  | "block-stack-definition-invalid"
  | "inventory-owner-missing"
  | "capacity-argument-owner-missing"
  | "cross-map-carry-owner-missing";

export type InventoryCapacityPreview = {
  accepted: boolean;
  slotCount: number;
  quantities: number[];
  addedQuantity: number;
  remainderQuantity: number;
};

export type InventoryCapacitySummary = {
  playerSlotCapacity: number;
  worldStorageSlotCapacity: number;
  normalBlockStackLimit: number;
  normalBlockItemCount: number;
  normalBlockItemIds: string[];
  playerSlotCapVerified: boolean;
  stackCapVerified: boolean;
  mergeVerified: boolean;
  overflowRemainderVerified: boolean;
  nonStackableSlotVerified: boolean;
  inventoryOwnerPresent: boolean;
  capacityArgumentOwnerPresent: boolean;
  crossMapCarryOwnerPresent: boolean;
  issueCounts: Record<string, number>;
  sourceContentHash: string;
  previews: {
    blockOverflow: InventoryCapacityPreview;
    blockMerge: InventoryCapacityPreview;
    fullNonStackable: InventoryCapacityPreview;
  };
  policy: {
    playerCarryUsesExactly40Slots: true;
    normalBlockStackUsesExactly64: true;
    overflowReturnsRemainder: true;
    sameDefinitionStacksMerge: true;
    nonStackableItemsConsumeOneSlot: true;
    crossMapCarryNeedsProfileOwner: true;
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    outputIsAuditOnly: true;
  };
};

export type InventoryCapacityAudit = {
  artifact: GeneratorArtifact<InventoryCapacityAuditInput, InventoryCapacitySummary>;
  graph: DependencyGraphValidation;
  summary: InventoryCapacitySummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function instance(definitionId: string, instanceId: string, quantity: number): ItemInstance {
  return {
    instanceId,
    definitionId,
    quantity,
    enhancement: 0,
    provenance: {
      eventId: "b06-audit",
      type: "starter",
      timestamp: 0,
      mapId: "obsidian-frontier",
      integrityHash: `b06:${definitionId}:${instanceId}:${quantity}`,
    },
  };
}

function preview(container: ItemInstance[], incoming: ItemInstance, capacity: number): InventoryCapacityPreview {
  const result = addItemToContainer(container, incoming, capacity);
  return {
    accepted: result.accepted,
    slotCount: result.inventory.length,
    quantities: result.inventory.map(item => item.quantity),
    addedQuantity: result.addedQuantity,
    remainderQuantity: result.remainder?.quantity ?? 0,
  };
}

function makeArtifact(input: InventoryCapacityAuditInput, summary: InventoryCapacitySummary): GeneratorArtifact<InventoryCapacityAuditInput, InventoryCapacitySummary> {
  const artifact: GeneratorArtifact<InventoryCapacityAuditInput, InventoryCapacitySummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: INVENTORY_CAPACITY_GENERATOR_ID,
    generatorVersion: INVENTORY_CAPACITY_GENERATOR_VERSION,
    kind: "item",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: INVENTORY_CAPACITY_GENERATOR_ID,
      generatorVersion: INVENTORY_CAPACITY_GENERATOR_VERSION,
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
    generatorId: INVENTORY_CAPACITY_GENERATOR_ID,
    generatorVersion: INVENTORY_CAPACITY_GENERATOR_VERSION,
    schemaVersion: INVENTORY_CAPACITY_RULES_VERSION,
    seed: "b06",
    rulesVersion: INVENTORY_CAPACITY_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: InventoryCapacityAuditInput): Required<InventoryCapacityAuditInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("B-06 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? INVENTORY_CAPACITY_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > INVENTORY_CAPACITY_MAX_SAMPLE_COUNT) throw new Error(`B-06 sampleCount must be an integer from 1 to ${INVENTORY_CAPACITY_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveInventoryCapacitySources(): InventoryCapacitySources {
  return {
    playerSlotCapacity: PLAYER_INVENTORY_SLOTS,
    worldStorageSlotCapacity: WORLD_STORAGE_DEFAULT_SLOTS,
    normalBlockStackLimit: 64,
    blockItems: BLOCK_ITEM_DEFINITIONS,
    inventoryOwnerPresent: true,
    capacityArgumentOwnerPresent: true,
    crossMapCarryOwnerPresent: false,
  };
}

export function buildInventoryCapacityDependencyGraphFromSources(input: InventoryCapacityAuditInput, sources: InventoryCapacitySources): InventoryCapacityAudit {
  const normalizedInput = normalizeInput(input);
  const blockItems = Array.from(sources.blockItems);
  const issueCounts: Record<string, number> = {};
  const issueCodes: InventoryCapacityIssueCode[] = [];
  const mark = (code: InventoryCapacityIssueCode) => {
    if (!issueCodes.includes(code)) issueCodes.push(code);
    increment(issueCounts, code);
  };
  const normalBlockItems = blockItems.filter(item => item.isBlockItem && item.tags.includes("block"));
  const normalBlockItemIds = normalBlockItems.map(item => item.id).sort();
  const canonicalBlock = getItemDefinition("block-obsidian-stone");

  if (sources.playerSlotCapacity !== PLAYER_INVENTORY_SLOTS) mark("player-slot-cap-invalid");
  if (sources.playerSlotCapacity < 1 || !Number.isInteger(sources.playerSlotCapacity)) mark("player-slot-cap-invalid");
  if (sources.worldStorageSlotCapacity !== WORLD_STORAGE_DEFAULT_SLOTS) mark("world-storage-slot-cap-invalid");
  if (sources.worldStorageSlotCapacity < 1 || !Number.isInteger(sources.worldStorageSlotCapacity)) mark("world-storage-slot-cap-invalid");
  if (sources.normalBlockStackLimit !== 64) mark("block-stack-cap-invalid");
  if (!canonicalBlock) mark("block-stack-definition-missing");
  if (canonicalBlock && (!canonicalBlock.isBlockItem || canonicalBlock.stackLimit !== sources.normalBlockStackLimit)) mark("block-stack-definition-invalid");
  if (normalBlockItems.some(item => !item.isBlockItem || item.stackLimit !== sources.normalBlockStackLimit)) mark("block-stack-definition-invalid");
  if (!sources.inventoryOwnerPresent) mark("inventory-owner-missing");
  if (!sources.capacityArgumentOwnerPresent) mark("capacity-argument-owner-missing");
  if (!sources.crossMapCarryOwnerPresent) mark("cross-map-carry-owner-missing");

  const blockOverflow = canonicalBlock
    ? preview([], instance(canonicalBlock.id, "b06-overflow", sources.normalBlockStackLimit + 1), 1)
    : { accepted: false, slotCount: 0, quantities: [], addedQuantity: 0, remainderQuantity: 0 };
  const blockMerge = canonicalBlock
    ? preview([instance(canonicalBlock.id, "b06-existing", sources.normalBlockStackLimit - 1)], instance(canonicalBlock.id, "b06-merge", 1), sources.playerSlotCapacity)
    : { accepted: false, slotCount: 0, quantities: [], addedQuantity: 0, remainderQuantity: 0 };
  const sword = getItemDefinition("sword-001");
  const fullNonStackable = sword
    ? preview(Array.from({ length: sources.playerSlotCapacity }, (_, index) => instance(sword.id, `b06-full-${index}`, 1)), instance(sword.id, "b06-full-incoming", 1), sources.playerSlotCapacity)
    : { accepted: false, slotCount: 0, quantities: [], addedQuantity: 0, remainderQuantity: 0 };
  const playerSlotCapVerified = sources.playerSlotCapacity === PLAYER_INVENTORY_SLOTS;
  const stackCapVerified = sources.normalBlockStackLimit === 64 && normalBlockItems.length > 0 && normalBlockItems.every(item => item.stackLimit === 64);
  const mergeVerified = blockMerge.addedQuantity === 1 && blockMerge.remainderQuantity === 0 && blockMerge.quantities[0] === sources.normalBlockStackLimit;
  const overflowRemainderVerified = blockOverflow.addedQuantity === sources.normalBlockStackLimit && blockOverflow.remainderQuantity === 1;
  const nonStackableSlotVerified = fullNonStackable.addedQuantity === 0 && fullNonStackable.remainderQuantity === 1 && fullNonStackable.slotCount === sources.playerSlotCapacity;

  const summary: InventoryCapacitySummary = {
    playerSlotCapacity: sources.playerSlotCapacity,
    worldStorageSlotCapacity: sources.worldStorageSlotCapacity,
    normalBlockStackLimit: sources.normalBlockStackLimit,
    normalBlockItemCount: normalBlockItems.length,
    normalBlockItemIds,
    playerSlotCapVerified,
    stackCapVerified,
    mergeVerified,
    overflowRemainderVerified,
    nonStackableSlotVerified,
    inventoryOwnerPresent: sources.inventoryOwnerPresent,
    capacityArgumentOwnerPresent: sources.capacityArgumentOwnerPresent,
    crossMapCarryOwnerPresent: sources.crossMapCarryOwnerPresent,
    issueCounts,
    sourceContentHash: hashStableJson({
      playerSlotCapacity: sources.playerSlotCapacity,
      worldStorageSlotCapacity: sources.worldStorageSlotCapacity,
      normalBlockStackLimit: sources.normalBlockStackLimit,
      blockItems,
      inventoryOwnerPresent: sources.inventoryOwnerPresent,
      capacityArgumentOwnerPresent: sources.capacityArgumentOwnerPresent,
      crossMapCarryOwnerPresent: sources.crossMapCarryOwnerPresent,
    } as unknown as JsonValue),
    previews: { blockOverflow, blockMerge, fullNonStackable },
    policy: {
      playerCarryUsesExactly40Slots: true,
      normalBlockStackUsesExactly64: true,
      overflowReturnsRemainder: true,
      sameDefinitionStacksMerge: true,
      nonStackableItemsConsumeOneSlot: true,
      crossMapCarryNeedsProfileOwner: true,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      outputIsAuditOnly: true,
    },
  };
  const sourceHash = summary.sourceContentHash;
  const policyHash = hashStableJson(summary as unknown as JsonValue);
  const nodes: DependencyGraphNode[] = [
    makeNode({ key: "inventory-capacity-sources:b06", kind: "item", contentHash: sourceHash }),
    makeNode({ key: "inventory-capacity-policy:b06", kind: "item", contentHash: policyHash }),
  ];
  const rootDependencies: GeneratorDependency[] = [
    { key: "inventory-capacity-sources:b06", kind: "item", required: true, generatorId: INVENTORY_CAPACITY_GENERATOR_ID, generatorVersion: INVENTORY_CAPACITY_GENERATOR_VERSION, contentHash: sourceHash },
    { key: "inventory-capacity-policy:b06", kind: "item", required: true, generatorId: INVENTORY_CAPACITY_GENERATOR_ID, generatorVersion: INVENTORY_CAPACITY_GENERATOR_VERSION, contentHash: policyHash },
  ];
  for (const code of issueCodes) rootDependencies.push({ key: `blocker:b06:${code}`, kind: "item", required: true });
  const root = makeNode({ key: "inventory-capacity:b06", kind: "item", contentHash: policyHash, dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildInventoryCapacityDependencyGraph(input: InventoryCapacityAuditInput = { seed: "inventory-capacity-b06" }): InventoryCapacityAudit {
  return buildInventoryCapacityDependencyGraphFromSources(input, readActiveInventoryCapacitySources());
}
