import type { AssetCredit, AssetCreditStatus } from "../../client/src/game/data/assetProvenance";
import type { PlantDefinition } from "../../client/src/game/data/plantCatalog";
import type { AssetPackEntry, AssetPackManifest } from "../../client/src/game/assets/assetPackLoader";
import { hashStableJson } from "./commonGeneratorApi";

export const PLANT_ASSET_BINDING_AUDIT_VERSION = "1.0.0" as const;
export const PLANT_ASSET_BINDING_AUDIT_RULES_VERSION = "plant-asset-binding-audit-rules.v1" as const;
export const DEFAULT_PLANT_SEED_ASSET_ID = "items.seed" as const;

export type PlantAssetBindingRole = "plant" | "seed";
export type PlantAssetBindingIssueCode =
  | "DUPLICATE_PLANT_ID"
  | "DUPLICATE_CREDIT_ID"
  | "MISSING_MANIFEST_ENTRY"
  | "MANIFEST_KIND_MISMATCH"
  | "MISSING_PROVENANCE"
  | "UNVERIFIED_PROVENANCE";

export type PlantAssetBindingIssue = {
  code: PlantAssetBindingIssueCode;
  plantId?: string;
  assetId: string;
  role?: PlantAssetBindingRole;
  detail: string;
};

export type PlantAssetBindingStatus = "verified" | "missing-manifest" | "kind-mismatch" | "missing-provenance" | "unverified-provenance";

export type PlantAssetBindingRecord = {
  plantId: string;
  displayName: string;
  role: PlantAssetBindingRole;
  assetId: string;
  manifestKind: AssetPackEntry["kind"] | null;
  provenanceStatus: AssetCreditStatus | null;
  status: PlantAssetBindingStatus;
};

export type PlantAssetBindingAuditInput = {
  plants: readonly PlantDefinition[];
  manifest: Pick<AssetPackManifest, "id" | "version" | "entries">;
  credits: readonly AssetCredit[];
  expectedManifestId?: string;
  seedAssetId?: string;
  rulesVersion?: string;
};

export type PlantAssetBindingAuditOutput = {
  artifact: {
    generatorId: "plant.asset-binding-audit";
    generatorVersion: typeof PLANT_ASSET_BINDING_AUDIT_VERSION;
    rulesVersion: typeof PLANT_ASSET_BINDING_AUDIT_RULES_VERSION;
    manifestId: string;
    manifestVersion: string;
    contentHash: string;
    plantCount: number;
    bindingCount: number;
  };
  summary: {
    plantCount: number;
    bindingCount: number;
    verifiedBindingCount: number;
    blockerCount: number;
    issueCounts: Record<PlantAssetBindingIssueCode, number>;
  };
  bindings: PlantAssetBindingRecord[];
  issues: PlantAssetBindingIssue[];
};

const ISSUE_CODES: PlantAssetBindingIssueCode[] = [
  "DUPLICATE_PLANT_ID",
  "DUPLICATE_CREDIT_ID",
  "MISSING_MANIFEST_ENTRY",
  "MANIFEST_KIND_MISMATCH",
  "MISSING_PROVENANCE",
  "UNVERIFIED_PROVENANCE",
];

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function emptyIssueCounts(): Record<PlantAssetBindingIssueCode, number> {
  return Object.fromEntries(ISSUE_CODES.map(code => [code, 0])) as Record<PlantAssetBindingIssueCode, number>;
}

function isDistributableStatus(status: AssetCreditStatus) {
  return status === "project-original" || status === "license-verified";
}

function bindingStatus(entry: AssetPackEntry | undefined, credit: AssetCredit | undefined): PlantAssetBindingStatus {
  if (!entry) return "missing-manifest";
  if (entry.kind !== "texture") return "kind-mismatch";
  if (!credit) return "missing-provenance";
  if (!isDistributableStatus(credit.status)) return "unverified-provenance";
  return "verified";
}

function addIssue(issues: PlantAssetBindingIssue[], issue: PlantAssetBindingIssue) {
  if (!issues.some(existing => existing.code === issue.code && existing.plantId === issue.plantId && existing.assetId === issue.assetId && existing.role === issue.role && existing.detail === issue.detail)) {
    issues.push(issue);
  }
}

function auditBinding(
  plant: Pick<PlantDefinition, "id" | "displayName">,
  role: PlantAssetBindingRole,
  assetId: string,
  manifest: PlantAssetBindingAuditInput["manifest"],
  creditByAssetId: ReadonlyMap<string, AssetCredit>,
  issues: PlantAssetBindingIssue[],
): PlantAssetBindingRecord {
  const entry = manifest.entries[assetId];
  const credit = creditByAssetId.get(assetId);
  const status = bindingStatus(entry, credit);
  if (!entry) {
    addIssue(issues, {
      code: "MISSING_MANIFEST_ENTRY",
      plantId: plant.id,
      role,
      assetId,
      detail: `${role} asset is not declared by manifest ${manifest.id}@${manifest.version}`,
    });
  } else if (entry.kind !== "texture") {
    addIssue(issues, {
      code: "MANIFEST_KIND_MISMATCH",
      plantId: plant.id,
      role,
      assetId,
      detail: `${role} asset must resolve to a texture entry, found ${entry.kind}`,
    });
  } else if (!credit) {
    addIssue(issues, {
      code: "MISSING_PROVENANCE",
      plantId: plant.id,
      role,
      assetId,
      detail: `${role} asset has no exact ASSET_CREDITS record`,
    });
  } else if (!isDistributableStatus(credit.status)) {
    addIssue(issues, {
      code: "UNVERIFIED_PROVENANCE",
      plantId: plant.id,
      role,
      assetId,
      detail: `${role} asset provenance status ${credit.status} is not distributable`,
    });
  }
  return {
    plantId: plant.id,
    displayName: plant.displayName,
    role,
    assetId,
    manifestKind: entry?.kind ?? null,
    provenanceStatus: credit?.status ?? null,
    status,
  };
}

export function auditPlantAssetBindings(input: PlantAssetBindingAuditInput): PlantAssetBindingAuditOutput {
  const rulesVersion = input.rulesVersion ?? PLANT_ASSET_BINDING_AUDIT_RULES_VERSION;
  if (rulesVersion !== PLANT_ASSET_BINDING_AUDIT_RULES_VERSION) throw new Error(`Unsupported plant asset binding audit rules version: ${rulesVersion}`);
  const expectedManifestId = input.expectedManifestId ?? "arcane-frontier-voxel-pixel";
  const seedAssetId = input.seedAssetId ?? DEFAULT_PLANT_SEED_ASSET_ID;
  const issues: PlantAssetBindingIssue[] = [];
  const issueCounts = emptyIssueCounts();
  const plants = [...input.plants].sort((left, right) => compareStrings(left.id, right.id));
  const credits = [...input.credits].sort((left, right) => compareStrings(left.assetId, right.assetId));
  const creditByAssetId = new Map<string, AssetCredit>();
  for (const credit of credits) {
    if (creditByAssetId.has(credit.assetId)) {
      addIssue(issues, {
        code: "DUPLICATE_CREDIT_ID",
        assetId: credit.assetId,
        detail: `ASSET_CREDITS contains duplicate asset ID ${credit.assetId}`,
      });
      continue;
    }
    creditByAssetId.set(credit.assetId, credit);
  }
  const seenPlantIds = new Set<string>();
  for (const plant of plants) {
    if (seenPlantIds.has(plant.id)) {
      addIssue(issues, {
        code: "DUPLICATE_PLANT_ID",
        plantId: plant.id,
        assetId: plant.assetId,
        role: "plant",
        detail: `Plant catalog contains duplicate plant ID ${plant.id}`,
      });
    }
    seenPlantIds.add(plant.id);
  }
  if (input.manifest.id !== expectedManifestId) {
    addIssue(issues, {
      code: "MISSING_MANIFEST_ENTRY",
      assetId: `manifest:${expectedManifestId}`,
      detail: `Expected active manifest ${expectedManifestId}, found ${input.manifest.id}`,
    });
  }
  const bindings = plants.flatMap(plant => [
    auditBinding(plant, "plant", plant.assetId, input.manifest, creditByAssetId, issues),
    auditBinding(plant, "seed", seedAssetId, input.manifest, creditByAssetId, issues),
  ]).sort((left, right) => compareStrings(left.plantId, right.plantId) || compareStrings(left.role, right.role) || compareStrings(left.assetId, right.assetId));
  for (const issue of issues) issueCounts[issue.code] += 1;
  const sortedIssues = issues.sort((left, right) => compareStrings(left.code, right.code) || compareStrings(left.plantId ?? "", right.plantId ?? "") || compareStrings(left.role ?? "", right.role ?? "") || compareStrings(left.assetId, right.assetId) || compareStrings(left.detail, right.detail));
  const contentHash = hashStableJson({
    rulesVersion,
    manifest: { id: input.manifest.id, version: input.manifest.version, entries: input.manifest.entries },
    plants,
    credits,
    expectedManifestId,
    seedAssetId,
    bindings,
    issues: sortedIssues,
  } as never);
  return {
    artifact: {
      generatorId: "plant.asset-binding-audit",
      generatorVersion: PLANT_ASSET_BINDING_AUDIT_VERSION,
      rulesVersion: PLANT_ASSET_BINDING_AUDIT_RULES_VERSION,
      manifestId: input.manifest.id,
      manifestVersion: input.manifest.version,
      contentHash,
      plantCount: plants.length,
      bindingCount: bindings.length,
    },
    summary: {
      plantCount: plants.length,
      bindingCount: bindings.length,
      verifiedBindingCount: bindings.filter(binding => binding.status === "verified").length,
      blockerCount: sortedIssues.length,
      issueCounts,
    },
    bindings,
    issues: sortedIssues,
  };
}
