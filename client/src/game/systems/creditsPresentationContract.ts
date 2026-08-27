import { ASSET_CREDITS, canDistributeAsset, type AssetCredit, type AssetCreditCategory, type AssetCreditStatus } from "@/game/data/assetProvenance";

export const CREDITS_PRESENTATION_CONTRACT_VERSION = "credits-presentation-contract.v1" as const;

type CreditsSectionId = "project-assets" | "licensed-assets" | "reference-only" | "needs-review";

type CreditsRejectionReason = "input-not-array" | "malformed-row" | "duplicate-asset-id" | "unknown-category" | "unknown-status";

export type CreditsRejection = {
  value: string | null;
  reason: CreditsRejectionReason;
};

export type CreditsPresentationEntry = AssetCredit & {
  section: CreditsSectionId;
  distributionAllowed: boolean;
  sourceStatus: "linked" | "not-provided";
  reviewRequired: boolean;
};

export type CreditsPresentationSection = {
  id: CreditsSectionId;
  title: string;
  description: string;
  entries: CreditsPresentationEntry[];
};

export type CreditsPresentationPolicy = {
  runtimeAssetDistributionAllowed: false;
  runtimeAssetPublishAllowed: false;
  referenceOnlySeparated: true;
  playerUiIntegration: false;
  persistenceWriteAllowed: false;
};

export type CreditsPresentation = {
  contractVersion: typeof CREDITS_PRESENTATION_CONTRACT_VERSION;
  valid: boolean;
  sections: CreditsPresentationSection[];
  acceptedEntries: CreditsPresentationEntry[];
  rejected: CreditsRejection[];
  policy: CreditsPresentationPolicy;
};

const CATEGORIES: readonly AssetCreditCategory[] = ["terrain", "block", "plant", "tree", "item", "character", "monster", "sky", "audio", "tool"];
const STATUSES: readonly AssetCreditStatus[] = ["project-original", "license-verified", "awaiting-contact", "reference-only"];
const POLICY: CreditsPresentationPolicy = {
  runtimeAssetDistributionAllowed: false,
  runtimeAssetPublishAllowed: false,
  referenceOnlySeparated: true,
  playerUiIntegration: false,
  persistenceWriteAllowed: false,
};

const SECTION_META: Record<CreditsSectionId, Pick<CreditsPresentationSection, "title" | "description">> = {
  "project-assets": { title: "ผลงานต้นฉบับของโปรเจกต์", description: "ทรัพย์สินที่ระบุว่าเป็นผลงานของ A_Survival" },
  "licensed-assets": { title: "ทรัพย์สินที่ตรวจใบอนุญาตแล้ว", description: "ทรัพย์สินที่มีสถานะ license-verified ตามข้อมูลเครดิต" },
  "reference-only": { title: "แหล่งอ้างอิงเท่านั้น", description: "ใช้ศึกษาแนวคิดหรือกฎเท่านั้น ไม่ใช่ asset ที่แจกจ่าย" },
  "needs-review": { title: "รอตรวจสอบสิทธิ์", description: "ยังไม่ควรแจกจ่ายหรือเผยแพร่จนกว่าจะตรวจสอบสิทธิ์ครบ" },
};

function sectionForStatus(status: AssetCreditStatus): CreditsSectionId {
  if (status === "project-original") return "project-assets";
  if (status === "license-verified") return "licensed-assets";
  if (status === "reference-only") return "reference-only";
  return "needs-review";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isValidSourceUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//.test(value);
}

function normalizeRow(value: unknown): { entry?: CreditsPresentationEntry; rejection?: CreditsRejection } {
  if (!isRecord(value) || typeof value.assetId !== "string" || typeof value.title !== "string" || typeof value.creator !== "string" || typeof value.attribution !== "string") return { rejection: { value: null, reason: "malformed-row" } };
  if (!CATEGORIES.includes(value.category as AssetCreditCategory)) return { rejection: { value: value.assetId, reason: "unknown-category" } };
  if (!STATUSES.includes(value.status as AssetCreditStatus)) return { rejection: { value: value.assetId, reason: "unknown-status" } };
  if (value.sourceUrl !== undefined && !isValidSourceUrl(value.sourceUrl)) return { rejection: { value: value.assetId, reason: "malformed-row" } };
  const status = value.status as AssetCreditStatus;
  const base: AssetCredit = {
    assetId: value.assetId,
    category: value.category as AssetCreditCategory,
    title: value.title,
    creator: value.creator,
    ...(isValidSourceUrl(value.sourceUrl) ? { sourceUrl: value.sourceUrl } : {}),
    ...(typeof value.sourceLabel === "string" ? { sourceLabel: value.sourceLabel } : {}),
    ...(typeof value.license === "string" ? { license: value.license } : {}),
    status,
    attribution: value.attribution,
    ...(typeof value.notes === "string" ? { notes: value.notes } : {}),
  };
  const section = sectionForStatus(status);
  const sourceStatus = base.sourceUrl ? "linked" : "not-provided";
  return { entry: { ...base, section, distributionAllowed: canDistributeAsset(base), sourceStatus, reviewRequired: section === "needs-review" || (section === "reference-only" && sourceStatus === "not-provided") } };
}

function sortedEntries(entries: CreditsPresentationEntry[]): CreditsPresentationEntry[] {
  return [...entries].sort((left, right) => left.section.localeCompare(right.section) || left.assetId.localeCompare(right.assetId));
}

export function createCreditsPresentation(candidate: unknown = ASSET_CREDITS): CreditsPresentation {
  if (!Array.isArray(candidate)) return { contractVersion: CREDITS_PRESENTATION_CONTRACT_VERSION, valid: false, sections: Object.entries(SECTION_META).map(([id, meta]) => ({ id: id as CreditsSectionId, ...meta, entries: [] })), acceptedEntries: [], rejected: [{ value: null, reason: "input-not-array" }], policy: POLICY };
  const entries: CreditsPresentationEntry[] = [];
  const rejected: CreditsRejection[] = [];
  const seen = new Set<string>();
  for (const value of candidate) {
    const normalized = normalizeRow(value);
    if (!normalized.entry) {
      if (normalized.rejection) rejected.push(normalized.rejection);
      continue;
    }
    if (seen.has(normalized.entry.assetId)) {
      rejected.push({ value: normalized.entry.assetId, reason: "duplicate-asset-id" });
      continue;
    }
    seen.add(normalized.entry.assetId);
    entries.push(normalized.entry);
  }
  const acceptedEntries = sortedEntries(entries);
  const sections = Object.entries(SECTION_META).map(([id, meta]) => ({ id: id as CreditsSectionId, ...meta, entries: acceptedEntries.filter(entry => entry.section === id) }));
  return { contractVersion: CREDITS_PRESENTATION_CONTRACT_VERSION, valid: rejected.length === 0, sections, acceptedEntries, rejected, policy: POLICY };
}

export function getCreditsSection(presentation: CreditsPresentation, sectionId: unknown): CreditsPresentationSection | undefined {
  if (!presentation.valid || typeof sectionId !== "string") return undefined;
  return presentation.sections.find(section => section.id === sectionId);
}
