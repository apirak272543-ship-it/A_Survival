import { ASSET_CREDITS, canDistributeAsset, type AssetCredit, type AssetCreditCategory, type AssetCreditStatus } from "@/game/data/assetProvenance";
import { calculateGeneratorContentHash, hashStableJson, type GeneratorArtifact, type GeneratorKind, type JsonValue } from "./commonGeneratorApi";
import { validateGeneratorDependencyGraph, type DependencyGraphNode, type DependencyGraphValidation, type GeneratorDependency } from "./dependencyGraph";

export const CREDITS_SUPPORTERS_GENERATOR_ID = "credits-supporters-provenance-audit";
export const CREDITS_SUPPORTERS_GENERATOR_VERSION = "1.0.0";
export const CREDITS_SUPPORTERS_RULES_VERSION = "c03.v1";
export const CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT = 64;

export type CreditsSupportersInput = {
  seed: string;
  sampleCount?: number;
};

export type CreditsSupportersSources = {
  credits: readonly AssetCredit[];
};

export type CreditsSupportersIssueCode =
  | "credit-count"
  | "duplicate-asset-id"
  | "asset-id-invalid"
  | "category-invalid"
  | "title-missing"
  | "creator-missing"
  | "attribution-missing"
  | "status-invalid"
  | "license-missing"
  | "reference-source-missing"
  | "reference-license-missing"
  | "reference-distribution-allowed"
  | "distributable-reference-url"
  | "contact-source-missing"
  | "contact-distribution-allowed";

export type CreditsSupportersSummary = {
  creditCount: number;
  sampleCount: number;
  uniqueAssetIdCount: number;
  distributableCount: number;
  projectOriginalCount: number;
  licenseVerifiedCount: number;
  referenceOnlyCount: number;
  awaitingContactCount: number;
  categoryCounts: Record<string, number>;
  statusCounts: Record<string, number>;
  issueCounts: Record<string, number>;
  runtimeReferencePolicy: {
    projectOriginalOrLicenseVerifiedMayDistribute: true;
    referenceOnlyIsNeverRuntimeDistributable: true;
    awaitingContactIsNeverRuntimeDistributable: true;
    sourceAndLicenseDisclosureRequired: true;
    creditsUiNavigationPresent: false;
    supportersContactWorkflowPresent: false;
    outputIsAuditOnly: true;
  };
  sourceContentHash: string;
};

export type CreditsSupportersAudit = {
  artifact: GeneratorArtifact<CreditsSupportersInput, CreditsSupportersSummary>;
  graph: DependencyGraphValidation;
  summary: CreditsSupportersSummary;
};

const ALLOWED_CATEGORIES: readonly AssetCreditCategory[] = ["terrain", "block", "plant", "tree", "item", "character", "monster", "sky", "audio", "tool"];
const ALLOWED_STATUSES: readonly AssetCreditStatus[] = ["project-original", "license-verified", "awaiting-contact", "reference-only"];

function increment(target: Record<string, number>, key: string) {
  target[key] = (target[key] ?? 0) + 1;
}

function hasText(value: unknown) {
  return typeof value === "string" && value.trim().length >= 3;
}

function auditCredit(credit: AssetCredit, issueCodes: CreditsSupportersIssueCode[]) {
  if (!/^[-a-z0-9][a-z0-9.-]{1,127}$/.test(credit.assetId)) issueCodes.push("asset-id-invalid");
  if (!ALLOWED_CATEGORIES.includes(credit.category)) issueCodes.push("category-invalid");
  if (!hasText(credit.title)) issueCodes.push("title-missing");
  if (!hasText(credit.creator)) issueCodes.push("creator-missing");
  if (!hasText(credit.attribution)) issueCodes.push("attribution-missing");
  if (!ALLOWED_STATUSES.includes(credit.status)) issueCodes.push("status-invalid");
  if (!hasText(credit.license)) issueCodes.push("license-missing");
  const distributable = canDistributeAsset(credit);
  if (credit.status === "reference-only") {
    if (!hasText(credit.sourceUrl) || !hasText(credit.sourceLabel)) issueCodes.push("reference-source-missing");
    if (!hasText(credit.license)) issueCodes.push("reference-license-missing");
    if (distributable) issueCodes.push("reference-distribution-allowed");
    if (credit.sourceUrl && distributable) issueCodes.push("distributable-reference-url");
  }
  if (credit.status === "awaiting-contact") {
    if (!hasText(credit.sourceUrl) || !hasText(credit.sourceLabel)) issueCodes.push("contact-source-missing");
    if (distributable) issueCodes.push("contact-distribution-allowed");
  }
}

function makeArtifact(input: CreditsSupportersInput, summary: CreditsSupportersSummary): GeneratorArtifact<CreditsSupportersInput, CreditsSupportersSummary> {
  const artifact: GeneratorArtifact<CreditsSupportersInput, CreditsSupportersSummary> = {
    schemaVersion: "a-survival.generator-artifact.v1",
    generatorId: CREDITS_SUPPORTERS_GENERATOR_ID,
    generatorVersion: CREDITS_SUPPORTERS_GENERATOR_VERSION,
    kind: "other",
    seed: input.seed,
    input,
    output: summary,
    assetRefs: [],
    contentHash: "",
    provenance: {
      generatorId: CREDITS_SUPPORTERS_GENERATOR_ID,
      generatorVersion: CREDITS_SUPPORTERS_GENERATOR_VERSION,
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
    generatorId: CREDITS_SUPPORTERS_GENERATOR_ID,
    generatorVersion: CREDITS_SUPPORTERS_GENERATOR_VERSION,
    schemaVersion: CREDITS_SUPPORTERS_RULES_VERSION,
    seed: "c03",
    rulesVersion: CREDITS_SUPPORTERS_RULES_VERSION,
    contentHash: input.contentHash,
    dependencies: input.dependencies ?? [],
  };
}

function normalizeInput(input: CreditsSupportersInput): Required<CreditsSupportersInput> {
  if (typeof input.seed !== "string" || input.seed.length === 0 || input.seed.length > 128) throw new Error("C-03 seed must be 1–128 characters");
  const sampleCount = input.sampleCount ?? CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT;
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || sampleCount > CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT) throw new Error(`C-03 sampleCount must be an integer from 1 to ${CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT}`);
  return { seed: input.seed, sampleCount };
}

export function readActiveCreditsSupportersSources(): CreditsSupportersSources {
  return { credits: ASSET_CREDITS.map(credit => ({ ...credit })) };
}

export function buildCreditsSupportersDependencyGraphFromSources(input: CreditsSupportersInput, sources: CreditsSupportersSources): CreditsSupportersAudit {
  const normalizedInput = normalizeInput(input);
  const credits = Array.from(sources.credits);
  const sampledCredits = credits.slice(0, normalizedInput.sampleCount);
  const issueCounts: Record<string, number> = {};
  const categoryCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  const assetIds = new Set<string>();
  const creditIssueKeys: Array<{ key: string; codes: CreditsSupportersIssueCode[] }> = [];
  let distributableCount = 0;
  let projectOriginalCount = 0;
  let licenseVerifiedCount = 0;
  let referenceOnlyCount = 0;
  let awaitingContactCount = 0;

  if (credits.length > CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT) increment(issueCounts, "credit-count");
  for (const credit of credits) {
    const issueCodes: CreditsSupportersIssueCode[] = [];
    if (assetIds.has(credit.assetId)) issueCodes.push("duplicate-asset-id");
    assetIds.add(credit.assetId);
    increment(categoryCounts, credit.category);
    increment(statusCounts, credit.status);
    if (canDistributeAsset(credit)) distributableCount += 1;
    if (credit.status === "project-original") projectOriginalCount += 1;
    if (credit.status === "license-verified") licenseVerifiedCount += 1;
    if (credit.status === "reference-only") referenceOnlyCount += 1;
    if (credit.status === "awaiting-contact") awaitingContactCount += 1;
    auditCredit(credit, issueCodes);
    for (const code of issueCodes) increment(issueCounts, code);
    if (issueCodes.length > 0) creditIssueKeys.push({ key: `credit:${credit.assetId}`, codes: issueCodes });
  }
  if (credits.length > CREDITS_SUPPORTERS_MAX_SAMPLE_COUNT) creditIssueKeys.push({ key: "catalog:c03", codes: ["credit-count"] });

  const nodes: DependencyGraphNode[] = sampledCredits.map(credit => makeNode({ key: `credit:${credit.assetId}`, kind: "other", contentHash: hashStableJson(credit as unknown as JsonValue) }));
  const rootDependencies: GeneratorDependency[] = sampledCredits.map(credit => ({
    key: `credit:${credit.assetId}`,
    kind: "other",
    required: true,
    generatorId: CREDITS_SUPPORTERS_GENERATOR_ID,
    generatorVersion: CREDITS_SUPPORTERS_GENERATOR_VERSION,
    contentHash: hashStableJson(credit as unknown as JsonValue),
  }));
  const blockerCodes = creditIssueKeys.flatMap(entry => entry.codes.map(code => `${entry.key}:${code}`));
  for (const blockerCode of blockerCodes) rootDependencies.push({ key: `blocker:c03:${blockerCode}`, kind: "other", required: true });

  const summary: CreditsSupportersSummary = {
    creditCount: credits.length,
    sampleCount: sampledCredits.length,
    uniqueAssetIdCount: assetIds.size,
    distributableCount,
    projectOriginalCount,
    licenseVerifiedCount,
    referenceOnlyCount,
    awaitingContactCount,
    categoryCounts,
    statusCounts,
    issueCounts,
    runtimeReferencePolicy: {
      projectOriginalOrLicenseVerifiedMayDistribute: true,
      referenceOnlyIsNeverRuntimeDistributable: true,
      awaitingContactIsNeverRuntimeDistributable: true,
      sourceAndLicenseDisclosureRequired: true,
      creditsUiNavigationPresent: false,
      supportersContactWorkflowPresent: false,
      outputIsAuditOnly: true,
    },
    sourceContentHash: hashStableJson({ credits } as unknown as JsonValue),
  };
  const root = makeNode({ key: "credits-supporters:c03", kind: "other", contentHash: hashStableJson(summary as unknown as JsonValue), dependencies: rootDependencies });
  const graph = validateGeneratorDependencyGraph([...nodes, root]);
  const artifact = makeArtifact(normalizedInput, summary);
  return { artifact, graph, summary };
}

export function buildCreditsSupportersDependencyGraph(input: CreditsSupportersInput = { seed: "credits-supporters-c03" }): CreditsSupportersAudit {
  return buildCreditsSupportersDependencyGraphFromSources(input, readActiveCreditsSupportersSources());
}
