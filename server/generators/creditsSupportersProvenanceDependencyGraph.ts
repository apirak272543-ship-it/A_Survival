import { ASSET_CREDITS, canDistributeAsset, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import {
  type DurableAssetRegistrySnapshot,
} from "./plantAssetProvenanceDependencyGraph";
import { hashStableJson, type GeneratorKind } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const CREDITS_SUPPORTERS_PROVENANCE_GRAPH_RULES_VERSION = "credits-supporters-provenance-graph-rules.v1" as const;
export const CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION = "1.0.0" as const;
export const CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION = "a-survival.credits-supporters-provenance.v1" as const;
export const CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS = 64 as const;

export type SupporterConsentStatus = "granted" | "pending" | "withdrawn" | "reference-only";
export type SupporterContribution = "funding" | "design" | "engineering" | "testing" | "community" | "reference";

export type SupporterProvenanceRecord = {
  supporterId: string;
  displayName: string;
  contribution: SupporterContribution;
  consentStatus: SupporterConsentStatus;
  attribution: string;
  sourceUrl?: string;
  notes?: string;
};

export type CreditsSupportersProvenanceSources = {
  credits: AssetCredit[];
  supporters: SupporterProvenanceRecord[] | null;
  durableRegistry: DurableAssetRegistrySnapshot | null;
};

export type CreditsSupportersReferenceType =
  | "credit-record"
  | "credit-status"
  | "supporter-record"
  | "supporter-consent"
  | "supporter-registry"
  | "durable-registry";

export type CreditsSupportersReference = {
  sourceKey: string;
  referenceType: CreditsSupportersReferenceType;
  referenceId: string;
  reason: string;
};

export type CreditAuditStatus = "verified" | "reference-only" | "invalid-record";
export type SupporterAuditStatus = "verified" | "pending-consent" | "withdrawn" | "reference-only" | "invalid-record";

export type CreditAuditRecord = {
  assetId: string;
  category: AssetCredit["category"];
  title: string;
  creator: string;
  status: AssetCredit["status"] | "missing";
  attribution: string;
  distributionAllowed: boolean;
  auditStatus: CreditAuditStatus;
};

export type SupporterAuditRecord = SupporterProvenanceRecord & {
  distributionAllowed: boolean;
  auditStatus: SupporterAuditStatus;
};

export type CreditsSupportersProvenanceDependencyGraphInput = {
  seed: string;
  rulesVersion?: string;
};

export type CreditsSupportersProvenanceDependencyGraphOutput = {
  artifact: {
    generatorId: "credits.supporters.provenance";
    generatorVersion: typeof CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION;
    schemaVersion: typeof CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION;
    seed: string;
    rulesVersion: string;
    contentHash: string;
    creditHash: string;
    supporterHash: string;
    creditCount: number;
    supporterCount: number;
  };
  credits: CreditAuditRecord[];
  supporters: SupporterAuditRecord[];
  summary: {
    creditCount: number;
    verifiedCreditCount: number;
    referenceOnlyCreditCount: number;
    invalidCreditCount: number;
    supporterRegistryPresent: boolean;
    supporterCount: number;
    verifiedSupporterCount: number;
    blockedSupporterCount: number;
    verifiedCreditIds: string[];
    blockedCreditIds: string[];
    verifiedSupporterIds: string[];
    blockedSupporterIds: string[];
    unresolvedReferenceCount: number;
    unresolvedReferenceTypes: Record<CreditsSupportersReferenceType, number>;
  };
  unresolvedReferences: CreditsSupportersReference[];
  nodes: DependencyGraphNode[];
  graph: DependencyGraphValidation;
};

export function readActiveCreditsSupportersProvenanceSources(): CreditsSupportersProvenanceSources {
  return { credits: ASSET_CREDITS.map(credit => ({ ...credit })), supporters: null, durableRegistry: null };
}

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function dependencyFor(target: DependencyGraphNode): GeneratorDependency {
  return {
    key: target.key,
    kind: target.kind,
    required: true,
    generatorId: target.generatorId,
    generatorVersion: target.generatorVersion,
    contentHash: target.contentHash,
  };
}

function missingDependency(key: string, kind: GeneratorKind): GeneratorDependency {
  return { key, kind, required: true };
}

function pushUnresolved(unresolvedReferences: CreditsSupportersReference[], sourceKey: string, referenceType: CreditsSupportersReferenceType, referenceId: string, reason: string) {
  unresolvedReferences.push({ sourceKey, referenceType, referenceId, reason });
}

function unresolvedReferenceTypes(unresolvedReferences: CreditsSupportersReference[]) {
  const referenceTypes: CreditsSupportersReferenceType[] = ["credit-record", "credit-status", "supporter-record", "supporter-consent", "supporter-registry", "durable-registry"];
  return Object.fromEntries(referenceTypes.map(type => [type, unresolvedReferences.filter(reference => reference.referenceType === type).length])) as Record<CreditsSupportersReferenceType, number>;
}

function auditCredit(credit: AssetCredit): CreditAuditRecord {
  const validRecord = Boolean(credit.assetId.trim() && credit.title.trim() && credit.creator.trim() && credit.attribution.trim());
  const distributionAllowed = validRecord && canDistributeAsset(credit);
  return {
    assetId: credit.assetId,
    category: credit.category,
    title: credit.title,
    creator: credit.creator,
    status: credit.status,
    attribution: credit.attribution,
    distributionAllowed,
    auditStatus: !validRecord ? "invalid-record" : distributionAllowed ? "verified" : "reference-only",
  };
}

function auditSupporter(supporter: SupporterProvenanceRecord): SupporterAuditRecord {
  const validRecord = Boolean(supporter.supporterId.trim() && supporter.displayName.trim() && supporter.attribution.trim());
  const distributionAllowed = validRecord && supporter.consentStatus === "granted";
  const auditStatus: SupporterAuditStatus = !validRecord
    ? "invalid-record"
    : supporter.consentStatus === "granted"
      ? "verified"
      : supporter.consentStatus === "pending"
        ? "pending-consent"
        : supporter.consentStatus;
  return { ...supporter, distributionAllowed, auditStatus };
}

function assertSeed(seed: string) {
  if (!seed.trim() || seed.length > 128) throw new Error("seed must be 1–128 characters");
}

export function buildCreditsSupportersProvenanceDependencyGraphFromSources(input: CreditsSupportersProvenanceDependencyGraphInput, sources: CreditsSupportersProvenanceSources): CreditsSupportersProvenanceDependencyGraphOutput {
  const rulesVersion = input.rulesVersion ?? CREDITS_SUPPORTERS_PROVENANCE_GRAPH_RULES_VERSION;
  if (rulesVersion !== CREDITS_SUPPORTERS_PROVENANCE_GRAPH_RULES_VERSION) throw new Error(`Unsupported credits/supporters provenance graph rules version: ${rulesVersion}`);
  assertSeed(input.seed);
  if (sources.credits.length > CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS) throw new Error(`credits must contain at most ${CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS} records`);
  if (sources.supporters && sources.supporters.length > CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS) throw new Error(`supporters must contain at most ${CREDITS_SUPPORTERS_PROVENANCE_MAX_RECORDS} records`);

  const sortedCredits = sources.credits.map(auditCredit).sort((left, right) => compareStrings(left.assetId, right.assetId));
  const sortedSupporters = (sources.supporters ?? []).map(auditSupporter).sort((left, right) => compareStrings(left.supporterId, right.supporterId));
  const unresolvedReferences: CreditsSupportersReference[] = [];
  const registryNode: DependencyGraphNode = {
    key: "credits-supporters:registry",
    kind: "other",
    generatorId: "credits.supporters.provenance",
    generatorVersion: CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION,
    schemaVersion: CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION,
    seed: input.seed,
    rulesVersion,
    contentHash: hashStableJson({ credits: sources.credits, supporters: sources.supporters } as never),
    dependencies: [],
  };
  const nodes: DependencyGraphNode[] = [registryNode];
  const creditIds = new Set<string>();
  for (const credit of sortedCredits) {
    const creditKey = `credit:${credit.assetId}`;
    const node: DependencyGraphNode = {
      key: creditKey,
      kind: "other",
      generatorId: "credits.supporters.provenance",
      generatorVersion: CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(credit as never),
      dependencies: [dependencyFor(registryNode)],
    };
    if (creditIds.has(credit.assetId) || !credit.assetId.trim() || !credit.title.trim() || !credit.creator.trim() || !credit.attribution.trim()) {
      node.dependencies.push(missingDependency(`credit-record:${credit.assetId || "unknown"}`, "other"));
      pushUnresolved(unresolvedReferences, node.key, "credit-record", credit.assetId || "unknown", "credit record is missing required assetId/title/creator/attribution or duplicates an existing assetId");
    }
    if (!credit.distributionAllowed) {
      node.dependencies.push(missingDependency(`credit-status:${credit.assetId || "unknown"}`, "other"));
      pushUnresolved(unresolvedReferences, node.key, "credit-status", credit.assetId || "unknown", `credit status ${credit.status} is not distributable`);
    }
    creditIds.add(credit.assetId);
    nodes.push(node);
  }

  if (sources.supporters === null) {
    registryNode.dependencies.push(missingDependency("supporters:registry", "other"));
    pushUnresolved(unresolvedReferences, registryNode.key, "supporter-registry", "supporters", "no explicit supporters registry is available; absence is not interpreted as consent or attribution");
  }
  const supporterIds = new Set<string>();
  for (const supporter of sortedSupporters) {
    const supporterKey = `supporter:${supporter.supporterId}`;
    const node: DependencyGraphNode = {
      key: supporterKey,
      kind: "other",
      generatorId: "credits.supporters.provenance",
      generatorVersion: CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash: hashStableJson(supporter as never),
      dependencies: [dependencyFor(registryNode)],
    };
    if (supporterIds.has(supporter.supporterId) || !supporter.supporterId.trim() || !supporter.displayName.trim() || !supporter.attribution.trim()) {
      node.dependencies.push(missingDependency(`supporter-record:${supporter.supporterId || "unknown"}`, "other"));
      pushUnresolved(unresolvedReferences, node.key, "supporter-record", supporter.supporterId || "unknown", "supporter record is missing required supporterId/displayName/attribution or duplicates an existing supporterId");
    }
    if (!supporter.distributionAllowed) {
      node.dependencies.push(missingDependency(`supporter-consent:${supporter.supporterId || "unknown"}`, "other"));
      pushUnresolved(unresolvedReferences, node.key, "supporter-consent", supporter.supporterId || "unknown", `supporter consent status ${supporter.consentStatus} is not publishable`);
    }
    supporterIds.add(supporter.supporterId);
    nodes.push(node);
  }

  if (sources.durableRegistry) {
    const durableRegistryNode: DependencyGraphNode = {
      key: "registry:credits-supporters",
      kind: "other",
      generatorId: "asset.registry",
      generatorVersion: CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: "a-survival.asset-registry.v1",
      seed: input.seed,
      rulesVersion,
      contentHash: sources.durableRegistry.contentHash,
      dependencies: [],
    };
    registryNode.dependencies.push(dependencyFor(durableRegistryNode));
    nodes.push(durableRegistryNode);
  } else {
    registryNode.dependencies.push(missingDependency("registry:credits-supporters", "other"));
    pushUnresolved(unresolvedReferences, registryNode.key, "durable-registry", "credits-supporters", "credits/supporters metadata has no durable registry snapshot binding");
  }

  const sortedUnresolvedReferences = unresolvedReferences.sort((left, right) => compareStrings(left.sourceKey, right.sourceKey) || compareStrings(left.referenceType, right.referenceType) || compareStrings(left.referenceId, right.referenceId) || compareStrings(left.reason, right.reason));
  const sortedNodes = nodes.sort((left, right) => compareStrings(left.key, right.key));
  const verifiedCreditIds = sortedCredits.filter(credit => credit.auditStatus === "verified" && sources.durableRegistry !== null).map(credit => credit.assetId);
  const blockedCreditIds = sortedCredits.filter(credit => !verifiedCreditIds.includes(credit.assetId)).map(credit => credit.assetId);
  const verifiedSupporterIds = sortedSupporters.filter(supporter => supporter.auditStatus === "verified" && sources.durableRegistry !== null).map(supporter => supporter.supporterId);
  const blockedSupporterIds = sortedSupporters.filter(supporter => !verifiedSupporterIds.includes(supporter.supporterId)).map(supporter => supporter.supporterId);
  const creditHash = hashStableJson(sortedCredits as never);
  const supporterHash = hashStableJson(sources.supporters as never);
  const contentHash = hashStableJson({ schemaVersion: CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION, generatorId: "credits.supporters.provenance", generatorVersion: CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION, seed: input.seed, rulesVersion, credits: sources.credits, supporters: sources.supporters, durableRegistry: sources.durableRegistry } as never);

  return {
    artifact: {
      generatorId: "credits.supporters.provenance",
      generatorVersion: CREDITS_SUPPORTERS_PROVENANCE_GENERATOR_VERSION,
      schemaVersion: CREDITS_SUPPORTERS_PROVENANCE_SCHEMA_VERSION,
      seed: input.seed,
      rulesVersion,
      contentHash,
      creditHash,
      supporterHash,
      creditCount: sortedCredits.length,
      supporterCount: sortedSupporters.length,
    },
    credits: sortedCredits,
    supporters: sortedSupporters,
    summary: {
      creditCount: sortedCredits.length,
      verifiedCreditCount: sortedCredits.filter(credit => credit.auditStatus === "verified").length,
      referenceOnlyCreditCount: sortedCredits.filter(credit => credit.auditStatus === "reference-only").length,
      invalidCreditCount: sortedCredits.filter(credit => credit.auditStatus === "invalid-record").length,
      supporterRegistryPresent: sources.supporters !== null,
      supporterCount: sortedSupporters.length,
      verifiedSupporterCount: sortedSupporters.filter(supporter => supporter.auditStatus === "verified").length,
      blockedSupporterCount: sortedSupporters.filter(supporter => supporter.auditStatus !== "verified").length,
      verifiedCreditIds,
      blockedCreditIds,
      verifiedSupporterIds,
      blockedSupporterIds,
      unresolvedReferenceCount: sortedUnresolvedReferences.length,
      unresolvedReferenceTypes: unresolvedReferenceTypes(sortedUnresolvedReferences),
    },
    unresolvedReferences: sortedUnresolvedReferences,
    nodes: sortedNodes,
    graph: validateGeneratorDependencyGraph(sortedNodes),
  };
}

export function buildCreditsSupportersProvenanceDependencyGraph(input: CreditsSupportersProvenanceDependencyGraphInput): CreditsSupportersProvenanceDependencyGraphOutput {
  return buildCreditsSupportersProvenanceDependencyGraphFromSources(input, readActiveCreditsSupportersProvenanceSources());
}
