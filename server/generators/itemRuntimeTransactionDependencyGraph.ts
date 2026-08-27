import { ALL_ITEMS, type ItemDefinition } from "@/game/data/catalog";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const ITEM_RUNTIME_TRANSACTION_GENERATOR_ID = "item-runtime-transaction-audit";
export const ITEM_RUNTIME_TRANSACTION_GENERATOR_VERSION = "1.0.0";
export const ITEM_RUNTIME_TRANSACTION_RULES_VERSION = "t03.runtime.v1";
export const ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT = 64;
export const ITEM_RUNTIME_TRANSACTION_MAX_QUANTITY = 64;

export type ItemRuntimeTransactionInput = {
  seed: string;
  sampleCount?: number;
};

export type ItemTransactionKind = "equip" | "combat" | "craft" | "assemble";
export type TransactionOwner = "server-authoritative" | "missing";

export type ItemCraftingRule = {
  id: string;
  inputDefinitionIds: readonly string[];
  outputDefinitionIds: readonly string[];
  atomic: true;
};

export type ItemAssemblyRule = {
  id: string;
  inputDefinitionIds: readonly string[];
  outputDefinitionIds: readonly string[];
  atomic: true;
};

export type ItemRuntimeTransactionSources = {
  itemDefinitions: readonly ItemDefinition[];
  equippableDefinitionIds: readonly string[];
  combatProfileDefinitionIds: readonly string[];
  craftingRules: readonly ItemCraftingRule[];
  assemblyRules: readonly ItemAssemblyRule[];
  transactionOwners: Readonly<Record<ItemTransactionKind, TransactionOwner>>;
};

export type ItemRuntimeTransactionIssueCode =
  | "catalog-size"
  | "duplicate-definition-id"
  | "invalid-definition-id"
  | "stack-limit-invalid"
  | "equipment-link-mismatch"
  | "combat-profile-missing"
  | "crafting-rules-missing"
  | "crafting-rule-invalid"
  | "assembly-rules-missing"
  | "assembly-rule-invalid"
  | "transaction-owner-missing"
  | "transaction-not-atomic";

export type ItemQuantity = {
  definitionId: string;
  quantity: number;
};

export type AtomicTransactionPreview = {
  accepted: boolean;
  reason: "ok" | "unknown-input" | "invalid-input-quantity" | "insufficient-input" | "unknown-output" | "invalid-output-quantity" | "output-stack-overflow";
  before: ItemQuantity[];
  after: ItemQuantity[];
  consumed: ItemQuantity[];
  produced: ItemQuantity[];
};

export type ItemRuntimeTransactionSummary = {
  itemCount: number;
  sampleCount: number;
  uniqueDefinitionIdCount: number;
  equippableCount: number;
  combatCandidateCount: number;
  combatProfileCount: number;
  craftingRuleCount: number;
  assemblyRuleCount: number;
  authoritativeOwnerCount: number;
  atomicCraftingRuleCount: number;
  atomicAssemblyRuleCount: number;
  issueCounts: Record<string, number>;
  behavior: {
    failedTransactionsLeaveInventoryUnchanged: true;
    validTransactionsConsumeAndProduceAtomically: true;
    unknownDefinitionsAreRejected: true;
    outputIsAuditOnly: true;
  };
  sourceContentHash: string;
};

export type ItemRuntimeTransactionAudit = {
  artifact: GeneratorArtifact<ItemRuntimeTransactionInput, ItemRuntimeTransactionSummary>;
  graph: DependencyGraphValidation;
  summary: ItemRuntimeTransactionSummary;
};

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function isPositiveInteger(value: number) {
  return Number.isInteger(value) && value > 0;
}

function itemDefinitionMap(itemDefinitions: readonly ItemDefinition[]) {
  return new Map(itemDefinitions.map(item => [item.id, item]));
}

function normalizeQuantities(values: readonly ItemQuantity[]) {
  const merged = new Map<string, number>();
  for (const value of values) merged.set(value.definitionId, (merged.get(value.definitionId) ?? 0) + value.quantity);
  return Array.from(merged.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([definitionId, quantity]) => ({ definitionId, quantity }));
}

function quantityOf(values: readonly ItemQuantity[], definitionId: string) {
  return values.find(value => value.definitionId === definitionId)?.quantity ?? 0;
}

function subtractQuantities(values: readonly ItemQuantity[], consumed: readonly ItemQuantity[]) {
  const byId = new Map(normalizeQuantities(values).map(value => [value.definitionId, value.quantity]));
  for (const value of consumed) byId.set(value.definitionId, (byId.get(value.definitionId) ?? 0) - value.quantity);
  return Array.from(byId.entries()).filter(([, quantity]) => quantity > 0).sort(([left], [right]) => left.localeCompare(right)).map(([definitionId, quantity]) => ({ definitionId, quantity }));
}

export function previewAtomicItemTransaction(input: { inventory: readonly ItemQuantity[]; consumes: readonly ItemQuantity[]; produces: readonly ItemQuantity[]; itemDefinitions: readonly ItemDefinition[] }): AtomicTransactionPreview {
  const definitions = itemDefinitionMap(input.itemDefinitions);
  const before = normalizeQuantities(input.inventory);
  const consumes = normalizeQuantities(input.consumes);
  const produces = normalizeQuantities(input.produces);
  const reject = (reason: AtomicTransactionPreview["reason"]): AtomicTransactionPreview => ({ accepted: false, reason, before, after: before, consumed: [], produced: [] });

  for (const value of consumes) {
    if (!definitions.has(value.definitionId)) return reject("unknown-input");
    if (!isPositiveInteger(value.quantity) || value.quantity > ITEM_RUNTIME_TRANSACTION_MAX_QUANTITY) return reject("invalid-input-quantity");
    if (quantityOf(before, value.definitionId) < value.quantity) return reject("insufficient-input");
  }
  for (const value of produces) {
    const definition = definitions.get(value.definitionId);
    if (!definition) return reject("unknown-output");
    if (!isPositiveInteger(value.quantity) || value.quantity > ITEM_RUNTIME_TRANSACTION_MAX_QUANTITY) return reject("invalid-output-quantity");
    if (quantityOf(subtractQuantities(before, consumes), value.definitionId) + value.quantity > definition.stackLimit) return reject("output-stack-overflow");
  }
  const after = normalizeQuantities([...subtractQuantities(before, consumes), ...produces]);
  return { accepted: true, reason: "ok", before, after, consumed: consumes, produced: produces };
}

function makeArtifact(input: ItemRuntimeTransactionInput, summary: ItemRuntimeTransactionSummary): GeneratorArtifact<ItemRuntimeTransactionInput, ItemRuntimeTransactionSummary> {
  const artifact: GeneratorArtifact<ItemRuntimeTransactionInput, ItemRuntimeTransactionSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: ITEM_RUNTIME_TRANSACTION_GENERATOR_ID,
    generatorVersion: ITEM_RUNTIME_TRANSACTION_GENERATOR_VERSION,
    kind: "item",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: ITEM_RUNTIME_TRANSACTION_GENERATOR_ID,
      generatorVersion: ITEM_RUNTIME_TRANSACTION_GENERATOR_VERSION,
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
    generatorId: ITEM_RUNTIME_TRANSACTION_GENERATOR_ID,
    generatorVersion: ITEM_RUNTIME_TRANSACTION_GENERATOR_VERSION,
    schemaVersion: ITEM_RUNTIME_TRANSACTION_RULES_VERSION,
    seed: "t03-runtime",
    rulesVersion: ITEM_RUNTIME_TRANSACTION_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: ItemRuntimeTransactionInput): Required<ItemRuntimeTransactionInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("T-03 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT) throw new Error(`T-03 sampleCount must be an integer from 1 to ${ITEM_RUNTIME_TRANSACTION_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

function isCombatCandidate(item: ItemDefinition) {
  return item.category === "sword" || item.category === "bow" || item.category === "ranged";
}

function auditRule(rule: ItemCraftingRule | ItemAssemblyRule, itemIds: Set<string>, issueCode: "crafting-rule-invalid" | "assembly-rule-invalid") {
  const issues: ItemRuntimeTransactionIssueCode[] = [];
  if (!rule.id || rule.inputDefinitionIds.length === 0 || rule.outputDefinitionIds.length === 0) issues.push(issueCode);
  if (rule.inputDefinitionIds.some(id => !itemIds.has(id)) || rule.outputDefinitionIds.some(id => !itemIds.has(id))) issues.push(issueCode);
  if (rule.atomic !== true) issues.push("transaction-not-atomic");
  return issues;
}

export function readActiveItemRuntimeTransactionSources(): ItemRuntimeTransactionSources {
  const itemDefinitions = ALL_ITEMS.map(item => ({ ...item, tags: [...item.tags] }));
  const combatCandidates = itemDefinitions.filter(isCombatCandidate);
  return {
    itemDefinitions,
    equippableDefinitionIds: itemDefinitions.filter(item => item.equippable).map(item => item.id),
    combatProfileDefinitionIds: [],
    craftingRules: [],
    assemblyRules: [],
    transactionOwners: { equip: "missing", combat: "missing", craft: "missing", assemble: "missing" },
  };
}

export function buildItemRuntimeTransactionDependencyGraphFromSources(input: ItemRuntimeTransactionInput, sources: ItemRuntimeTransactionSources): ItemRuntimeTransactionAudit {
  const normalizedInput = normalizeInput(input);
  const itemDefinitions = Array.from(sources.itemDefinitions);
  const sampledDefinitions = itemDefinitions.slice(0, normalizedInput.sampleCount);
  const itemIds = new Set<string>();
  const issueCounts: Record<string, number> = {};
  const itemIssueKeys: Array<{ key: string; codes: ItemRuntimeTransactionIssueCode[] }> = [];
  const combatCandidates = itemDefinitions.filter(isCombatCandidate);
  const combatProfileIds = new Set(sources.combatProfileDefinitionIds);
  const equippableIds = new Set(sources.equippableDefinitionIds);
  let validDefinitionCount = 0;
  let atomicCraftingRuleCount = 0;
  let atomicAssemblyRuleCount = 0;
  let authoritativeOwnerCount = 0;

  if (itemDefinitions.length !== ALL_ITEMS.length) increment(issueCounts, "catalog-size");
  for (const item of itemDefinitions) {
    const issueCodes: ItemRuntimeTransactionIssueCode[] = [];
    if (itemIds.has(item.id)) issueCodes.push("duplicate-definition-id");
    itemIds.add(item.id);
    if (!/^[a-z0-9][a-z0-9._-]{2,63}$/.test(item.id)) issueCodes.push("invalid-definition-id");
    if (!Number.isInteger(item.stackLimit) || item.stackLimit < 1) issueCodes.push("stack-limit-invalid");
    if (item.equippable !== equippableIds.has(item.id)) issueCodes.push("equipment-link-mismatch");
    if (isCombatCandidate(item) && !combatProfileIds.has(item.id)) issueCodes.push("combat-profile-missing");
    if (issueCodes.length === 0) validDefinitionCount += 1;
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length > 0) itemIssueKeys.push({ key: `item:${item.id}`, codes: issueCodes });
  }
  for (const rule of sources.craftingRules) {
    const issues = auditRule(rule, itemIds, "crafting-rule-invalid");
    if (rule.atomic === true) atomicCraftingRuleCount += 1;
    for (const code of issues) increment(issueCounts, code);
    if (issues.length > 0) itemIssueKeys.push({ key: `crafting:${rule.id}`, codes: issues });
  }
  for (const rule of sources.assemblyRules) {
    const issues = auditRule(rule, itemIds, "assembly-rule-invalid");
    if (rule.atomic === true) atomicAssemblyRuleCount += 1;
    for (const code of issues) increment(issueCounts, code);
    if (issues.length > 0) itemIssueKeys.push({ key: `assembly:${rule.id}`, codes: issues });
  }
  if (combatCandidates.length > 0 && combatProfileIds.size === 0) {
    increment(issueCounts, "combat-profile-missing");
    itemIssueKeys.push({ key: "combat:fallback", codes: ["combat-profile-missing"] });
  }
  if (sources.craftingRules.length === 0) {
    increment(issueCounts, "crafting-rules-missing");
    itemIssueKeys.push({ key: "crafting:fallback", codes: ["crafting-rules-missing"] });
  }
  if (sources.assemblyRules.length === 0) {
    increment(issueCounts, "assembly-rules-missing");
    itemIssueKeys.push({ key: "assembly:fallback", codes: ["assembly-rules-missing"] });
  }
  for (const kind of ["equip", "combat", "craft", "assemble"] as const) {
    if (sources.transactionOwners[kind] === "server-authoritative") authoritativeOwnerCount += 1;
    else {
      increment(issueCounts, "transaction-owner-missing");
      itemIssueKeys.push({ key: `owner:${kind}`, codes: ["transaction-owner-missing"] });
    }
  }
  if (itemDefinitions.length !== ALL_ITEMS.length) itemIssueKeys.push({ key: "catalog:t03", codes: ["catalog-size"] });

  const nodes: DependencyGraphNode[] = sampledDefinitions.map(item => makeNode({ key: `item:${item.id}`, kind: "item", contentHash: hashStableJson(item as unknown as JsonValue) }));
  const rootDependencies: GeneratorDependency[] = sampledDefinitions.map(item => ({
    key: `item:${item.id}`,
    kind: "item",
    required: true,
    generatorId: ITEM_RUNTIME_TRANSACTION_GENERATOR_ID,
    generatorVersion: ITEM_RUNTIME_TRANSACTION_GENERATOR_VERSION,
    contentHash: hashStableJson(item as unknown as JsonValue),
  }));
  const blockerCodes = itemIssueKeys.flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:t03:${blockerCode}`, kind: "other", required: true });

  const summary: ItemRuntimeTransactionSummary = {
    itemCount: itemDefinitions.length,
    sampleCount: sampledDefinitions.length,
    uniqueDefinitionIdCount: itemIds.size,
    equippableCount: equippableIds.size,
    combatCandidateCount: combatCandidates.length,
    combatProfileCount: combatProfileIds.size,
    craftingRuleCount: sources.craftingRules.length,
    assemblyRuleCount: sources.assemblyRules.length,
    authoritativeOwnerCount,
    atomicCraftingRuleCount,
    atomicAssemblyRuleCount,
    issueCounts,
    behavior: {
      failedTransactionsLeaveInventoryUnchanged: true,
      validTransactionsConsumeAndProduceAtomically: true,
      unknownDefinitionsAreRejected: true,
      outputIsAuditOnly: true,
    },
    sourceContentHash: hashStableJson({ itemDefinitions, equippableDefinitionIds: Array.from(equippableIds).sort(), combatProfileDefinitionIds: Array.from(combatProfileIds).sort(), craftingRules: sources.craftingRules, assemblyRules: sources.assemblyRules, transactionOwners: sources.transactionOwners } as unknown as JsonValue),
  };
  const root = makeNode({ key: "item-runtime-transaction:t03", kind: "item", contentHash: hashStableJson(summary as unknown as JsonValue), dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildItemRuntimeTransactionDependencyGraph(input: ItemRuntimeTransactionInput = { seed: "item-runtime-transaction-t03" }): ItemRuntimeTransactionAudit {
  return buildItemRuntimeTransactionDependencyGraphFromSources(input, readActiveItemRuntimeTransactionSources());
}
