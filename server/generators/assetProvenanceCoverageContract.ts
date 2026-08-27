import { ALL_ITEMS, type ItemDefinition } from "../../client/src/game/data/catalog";
import { ASSET_CREDITS, canDistributeAsset, type AssetCredit } from "../../client/src/game/data/assetProvenance";
import { PLANT_CATALOG, type PlantDefinition } from "../../client/src/game/data/plantCatalog";
import { isAssetPackManifest, type AssetPackEntry, type AssetPackManifest } from "../../client/src/game/assets/assetPackLoader";
import { hashStableJson } from "./commonGeneratorApi";

export const ASSET_PROVENANCE_COVERAGE_RULES_VERSION = "asset-provenance-coverage-rules.v1" as const;
export const ASSET_PROVENANCE_COVERAGE_GENERATOR_VERSION = "1.0.0" as const;
export const ACTIVE_ASSET_PACK_ID = "arcane-frontier-voxel-pixel" as const;

const MAX_CATALOG_ENTRIES = 4096;

type AssetCoverageReferenceType = "item-icon" | "item-model" | "plant-asset" | "plant-seed-icon";

export type AssetCoverageIssueCode =
  | "MISSING_MANIFEST_ENTRY"
  | "MANIFEST_KIND_MISMATCH"
  | "MISSING_SHA256"
  | "MISSING_CREDIT"
  | "NON_DISTRIBUTABLE_CREDIT";

export type AssetCoverageReference = {
  sourceKey: string;
  sourceType: AssetCoverageReferenceType;
  sourceId: string;
  assetId: string;
  expectedKinds: AssetPackEntry["kind"][];
};

export type AssetCoverageIssue = {
  code: AssetCoverageIssueCode;
  sourceKey: string;
  assetId: string;
  detail: string;
};

export type AssetCoverageAssetResult = {
  assetId: string;
  referenceCount: number;
  expectedKinds: AssetPackEntry["kind"][];
  manifestKind?: AssetPackEntry["kind"];
  manifestPresent: boolean;
  manifestKindMatches: boolean;
  sha256Present: boolean;
  creditPresent: boolean;
  creditStatus?: AssetCredit["status"];
  distributableCredit: boolean;
  valid: boolean;
};

export type AssetProvenanceCoverageInput = {
  seed: string;
  manifest: AssetPackManifest;
  credits?: readonly AssetCredit[];
  items?: readonly ItemDefinition[];
  plants?: readonly PlantDefinition[];
  rulesVersion?: string;
};

export type AssetProvenanceCoverageOutput = {
  artifact: {
    generatorId: "asset.provenance.coverage";
    generatorVersion: typeof ASSET_PROVENANCE_COVERAGE_GENERATOR_VERSION;
    seed: string;
    rulesVersion: typeof ASSET_PROVENANCE_COVERAGE_RULES_VERSION;
    manifestId: string;
    manifestVersion: string;
    manifestHash: string;
    coverageHash: string;
  };
  summary: {
    itemCount: number;
    plantCount: number;
    referenceCount: number;
    uniqueAssetCount: number;
    manifestMatchCount: number;
    missingManifestCount: number;
    kindMatchCount: number;
    kindMismatchCount: number;
    sha256MatchCount: number;
    missingSha256Count: number;
    creditMatchCount: number;
    missingCreditCount: number;
    distributableCreditCount: number;
    nonDistributableCreditCount: number;
    issueCount: number;
    valid: boolean;
  };
  assets: AssetCoverageAssetResult[];
  references: AssetCoverageReference[];
  issues: AssetCoverageIssue[];
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
};

function assertBoundedCatalog(value: readonly unknown[], label: string) {
  if (value.length > MAX_CATALOG_ENTRIES) throw new Error(`${label} must contain at most ${MAX_CATALOG_ENTRIES} entries`);
}

function validateRulesVersion(rulesVersion: string | undefined) {
  const normalized = rulesVersion ?? ASSET_PROVENANCE_COVERAGE_RULES_VERSION;
  if (normalized !== ASSET_PROVENANCE_COVERAGE_RULES_VERSION) throw new Error(`Unsupported asset provenance coverage rules version: ${normalized}`);
  return normalized;
}

function addReference(references: AssetCoverageReference[], reference: AssetCoverageReference) {
  if (!reference.assetId) return;
  references.push({ ...reference, expectedKinds: Array.from(new Set(reference.expectedKinds)).sort() });
}

function collectReferences(items: readonly ItemDefinition[], plants: readonly PlantDefinition[]) {
  const references: AssetCoverageReference[] = [];
  for (const item of items) {
    if (item.iconAssetId) {
      addReference(references, {
        sourceKey: `item:${item.id}:icon`,
        sourceType: "item-icon",
        sourceId: item.id,
        assetId: item.iconAssetId,
        expectedKinds: ["texture"],
      });
    }
    if (item.modelAssetId) {
      addReference(references, {
        sourceKey: `item:${item.id}:model`,
        sourceType: "item-model",
        sourceId: item.id,
        assetId: item.modelAssetId,
        expectedKinds: ["model"],
      });
    }
  }
  for (const plant of plants) {
    addReference(references, {
      sourceKey: `plant:${plant.id}:asset`,
      sourceType: "plant-asset",
      sourceId: plant.id,
      assetId: plant.assetId,
      expectedKinds: ["texture", "model"],
    });
    addReference(references, {
      sourceKey: `plant:${plant.id}:seed-icon`,
      sourceType: "plant-seed-icon",
      sourceId: plant.id,
      assetId: "items.seed",
      expectedKinds: ["texture"],
    });
  }
  return references.sort((left, right) => left.sourceKey.localeCompare(right.sourceKey) || left.assetId.localeCompare(right.assetId));
}

function addIssue(issues: AssetCoverageIssue[], code: AssetCoverageIssueCode, reference: AssetCoverageReference, detail: string) {
  issues.push({ code, sourceKey: reference.sourceKey, assetId: reference.assetId, detail });
}

export function buildAssetProvenanceCoverage(input: AssetProvenanceCoverageInput): AssetProvenanceCoverageOutput {
  const rulesVersion = validateRulesVersion(input.rulesVersion);
  if (!input.seed.trim()) throw new Error("seed must not be empty");
  if (!isAssetPackManifest(input.manifest)) throw new Error("Active asset manifest shape is invalid");
  if (input.manifest.id !== ACTIVE_ASSET_PACK_ID) throw new Error(`Asset provenance coverage only accepts active pack ${ACTIVE_ASSET_PACK_ID}`);

  const items = input.items ?? ALL_ITEMS;
  const plants = input.plants ?? PLANT_CATALOG;
  assertBoundedCatalog(items, "items");
  assertBoundedCatalog(plants, "plants");

  const credits = new Map<string, AssetCredit>();
  for (const credit of input.credits ?? ASSET_CREDITS) {
    if (credits.has(credit.assetId)) throw new Error(`Duplicate asset credit ID: ${credit.assetId}`);
    credits.set(credit.assetId, credit);
  }

  const references = collectReferences(items, plants);
  const referencesByAssetId = new Map<string, AssetCoverageReference[]>();
  for (const reference of references) {
    const current = referencesByAssetId.get(reference.assetId) ?? [];
    current.push(reference);
    referencesByAssetId.set(reference.assetId, current);
  }

  const issues: AssetCoverageIssue[] = [];
  const assets = Array.from(referencesByAssetId.entries()).sort(([left], [right]) => left.localeCompare(right)).map(([assetId, assetReferences]) => {
    const entry = input.manifest.entries[assetId];
    const credit = credits.get(assetId);
    const expectedKinds = Array.from(new Set(assetReferences.flatMap(reference => reference.expectedKinds))).sort();
    const manifestPresent = Boolean(entry);
    const manifestKindMatches = Boolean(entry && expectedKinds.includes(entry.kind));
    const sha256Present = Boolean(entry?.sha256);
    const creditPresent = Boolean(credit);
    const distributableCredit = Boolean(credit && canDistributeAsset(credit));
    const firstReference = assetReferences[0]!;

    if (!manifestPresent) addIssue(issues, "MISSING_MANIFEST_ENTRY", firstReference, `asset ID ${assetId} is not present in active manifest ${input.manifest.id}`);
    else if (!manifestKindMatches) addIssue(issues, "MANIFEST_KIND_MISMATCH", firstReference, `asset ID ${assetId} has manifest kind ${entry!.kind}, expected ${expectedKinds.join(" or ")}`);
    if (!sha256Present) addIssue(issues, "MISSING_SHA256", firstReference, `asset ID ${assetId} has no SHA-256 in the active manifest`);
    if (!creditPresent) addIssue(issues, "MISSING_CREDIT", firstReference, `asset ID ${assetId} has no matching provenance credit`);
    else if (!distributableCredit) addIssue(issues, "NON_DISTRIBUTABLE_CREDIT", firstReference, `asset ID ${assetId} has credit status ${credit!.status}, which is not distributable`);

    return {
      assetId,
      referenceCount: assetReferences.length,
      expectedKinds,
      manifestKind: entry?.kind,
      manifestPresent,
      manifestKindMatches,
      sha256Present,
      creditPresent,
      creditStatus: credit?.status,
      distributableCredit,
      valid: manifestPresent && manifestKindMatches && sha256Present && distributableCredit,
    } satisfies AssetCoverageAssetResult;
  });

  const manifestMatchCount = assets.filter(asset => asset.manifestPresent).length;
  const kindMatchCount = assets.filter(asset => asset.manifestKindMatches).length;
  const sha256MatchCount = assets.filter(asset => asset.sha256Present).length;
  const creditMatchCount = assets.filter(asset => asset.creditPresent).length;
  const distributableCreditCount = assets.filter(asset => asset.distributableCredit).length;
  const valid = assets.every(asset => asset.valid) && issues.length === 0;
  const summary = {
    itemCount: items.length,
    plantCount: plants.length,
    referenceCount: references.length,
    uniqueAssetCount: assets.length,
    manifestMatchCount,
    missingManifestCount: assets.length - manifestMatchCount,
    kindMatchCount,
    kindMismatchCount: assets.filter(asset => asset.manifestPresent && !asset.manifestKindMatches).length,
    sha256MatchCount,
    missingSha256Count: assets.length - sha256MatchCount,
    creditMatchCount,
    missingCreditCount: assets.filter(asset => !asset.creditPresent).length,
    distributableCreditCount,
    nonDistributableCreditCount: assets.filter(asset => asset.creditPresent && !asset.distributableCredit).length,
    issueCount: issues.length,
    valid,
  } satisfies AssetProvenanceCoverageOutput["summary"];

  return {
    artifact: {
      generatorId: "asset.provenance.coverage",
      generatorVersion: ASSET_PROVENANCE_COVERAGE_GENERATOR_VERSION,
      seed: input.seed,
      rulesVersion,
      manifestId: input.manifest.id,
      manifestVersion: input.manifest.version,
      manifestHash: hashStableJson(input.manifest as never),
      coverageHash: hashStableJson({ manifest: input.manifest, credits: Array.from(credits.values()).sort((left, right) => left.assetId.localeCompare(right.assetId)), references } as never),
    },
    summary,
    assets,
    references,
    issues: issues.sort((left, right) => left.assetId.localeCompare(right.assetId) || left.code.localeCompare(right.code) || left.sourceKey.localeCompare(right.sourceKey)),
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
  };
}
