import type { AssetCreditStatus } from "../../client/src/game/data/assetProvenance";
import { hashStableJson } from "./commonGeneratorApi";

export const LANGUAGE_RATING_VOICE_POLICY_VERSION = "1.0.0" as const;
export const LANGUAGE_RATING_VOICE_POLICY_RULES_VERSION = "language-rating-voice-policy-rules.v1" as const;
export const LANGUAGE_RATING_VOICE_POLICY_SOURCE = "docs/LANGUAGE_RATING_VOICE_POLICY.md" as const;

export type PolicyCopyLayer = "system" | "safety" | "hud" | "npc" | "plant-effect" | "credits";
export type PolicyDisclosure = "none" | "fictional-effect" | "adult-content";
export type VoiceLicenseStatus = AssetCreditStatus;

export type PolicyCopyRecord = {
  id: string;
  layer: PolicyCopyLayer;
  locale: "th-TH" | string;
  text: string;
  containsProfanity: boolean;
  usesClearWording: boolean;
  disclosure: PolicyDisclosure;
};

export type VoiceAssetRecord = {
  assetId: string;
  licenseStatus: VoiceLicenseStatus;
  provenanceRef?: string;
  hasTextFallback: boolean;
  identityClaim?: string;
};

export type LanguageRatingVoicePolicyInput = {
  ratingLabel: string;
  externalCertification: "not-claimed" | "verified";
  copy: readonly PolicyCopyRecord[];
  voice: readonly VoiceAssetRecord[];
  rulesVersion?: string;
};

export type LanguageRatingVoicePolicyIssueCode =
  | "DUPLICATE_COPY_ID"
  | "DUPLICATE_VOICE_ASSET_ID"
  | "RATING_LABEL_MISSING"
  | "EXTERNAL_RATING_CLAIM_UNSUPPORTED"
  | "PRIMARY_COPY_NOT_THAI"
  | "COPY_TEXT_MISSING"
  | "SYSTEM_COPY_PROFANITY"
  | "SYSTEM_COPY_UNCLEAR"
  | "PLANT_EFFECT_DISCLOSURE_MISSING"
  | "VOICE_PROVENANCE_MISSING"
  | "VOICE_LICENSE_UNVERIFIED"
  | "VOICE_TEXT_FALLBACK_MISSING"
  | "VOICE_IDENTITY_CLAIM_UNSUPPORTED";

export type LanguageRatingVoicePolicyIssue = {
  code: LanguageRatingVoicePolicyIssueCode;
  recordId: string;
  detail: string;
};

export type LanguageRatingVoicePolicyOutput = {
  artifact: {
    generatorId: "language.rating-voice-policy";
    generatorVersion: typeof LANGUAGE_RATING_VOICE_POLICY_VERSION;
    rulesVersion: typeof LANGUAGE_RATING_VOICE_POLICY_RULES_VERSION;
    contentHash: string;
    copyCount: number;
    voiceAssetCount: number;
  };
  summary: {
    valid: boolean;
    ratingLabel: string;
    externalCertification: LanguageRatingVoicePolicyInput["externalCertification"];
    thaiCopyCount: number;
    copyCount: number;
    voiceAssetCount: number;
    distributableVoiceAssetCount: number;
    issueCounts: Record<LanguageRatingVoicePolicyIssueCode, number>;
  };
  issues: LanguageRatingVoicePolicyIssue[];
  runtimePolicy: {
    primaryLocale: "th-TH";
    playerSafetyCopyRequired: true;
    voiceOptional: true;
    textFallbackRequired: true;
    externalRatingClaimed: false;
  };
};

const ISSUE_CODES: LanguageRatingVoicePolicyIssueCode[] = [
  "DUPLICATE_COPY_ID",
  "DUPLICATE_VOICE_ASSET_ID",
  "RATING_LABEL_MISSING",
  "EXTERNAL_RATING_CLAIM_UNSUPPORTED",
  "PRIMARY_COPY_NOT_THAI",
  "COPY_TEXT_MISSING",
  "SYSTEM_COPY_PROFANITY",
  "SYSTEM_COPY_UNCLEAR",
  "PLANT_EFFECT_DISCLOSURE_MISSING",
  "VOICE_PROVENANCE_MISSING",
  "VOICE_LICENSE_UNVERIFIED",
  "VOICE_TEXT_FALLBACK_MISSING",
  "VOICE_IDENTITY_CLAIM_UNSUPPORTED",
];

function compareStrings(left: string, right: string) {
  return left.localeCompare(right);
}

function emptyIssueCounts(): Record<LanguageRatingVoicePolicyIssueCode, number> {
  return Object.fromEntries(ISSUE_CODES.map(code => [code, 0])) as Record<LanguageRatingVoicePolicyIssueCode, number>;
}

function isDistributableVoiceStatus(status: VoiceLicenseStatus) {
  return status === "project-original" || status === "license-verified";
}

function addIssue(issues: LanguageRatingVoicePolicyIssue[], issue: LanguageRatingVoicePolicyIssue) {
  if (!issues.some(existing => existing.code === issue.code && existing.recordId === issue.recordId && existing.detail === issue.detail)) issues.push(issue);
}

function auditCopy(record: PolicyCopyRecord, issues: LanguageRatingVoicePolicyIssue[]) {
  if (record.locale !== "th-TH") addIssue(issues, { code: "PRIMARY_COPY_NOT_THAI", recordId: record.id, detail: `Primary copy must be Thai (th-TH), found ${record.locale}` });
  if (record.text.trim().length === 0) addIssue(issues, { code: "COPY_TEXT_MISSING", recordId: record.id, detail: "Policy copy must contain readable text" });
  if ((record.layer === "system" || record.layer === "safety" || record.layer === "credits") && record.containsProfanity) {
    addIssue(issues, { code: "SYSTEM_COPY_PROFANITY", recordId: record.id, detail: `${record.layer} copy must not contain profanity` });
  }
  if ((record.layer === "system" || record.layer === "safety") && !record.usesClearWording) {
    addIssue(issues, { code: "SYSTEM_COPY_UNCLEAR", recordId: record.id, detail: `${record.layer} copy must use clear, direct wording` });
  }
  if (record.layer === "plant-effect" && record.disclosure !== "fictional-effect") {
    addIssue(issues, { code: "PLANT_EFFECT_DISCLOSURE_MISSING", recordId: record.id, detail: "Plant effect copy must disclose that effects are fictional" });
  }
}

function auditVoice(record: VoiceAssetRecord, issues: LanguageRatingVoicePolicyIssue[]) {
  if (!record.provenanceRef?.trim()) addIssue(issues, { code: "VOICE_PROVENANCE_MISSING", recordId: record.assetId, detail: "Voice asset requires a durable provenance reference" });
  if (!isDistributableVoiceStatus(record.licenseStatus)) addIssue(issues, { code: "VOICE_LICENSE_UNVERIFIED", recordId: record.assetId, detail: `Voice asset license status ${record.licenseStatus} is not distributable` });
  if (!record.hasTextFallback) addIssue(issues, { code: "VOICE_TEXT_FALLBACK_MISSING", recordId: record.assetId, detail: "Voice is optional; important content must remain readable without audio" });
  if (record.identityClaim?.trim()) addIssue(issues, { code: "VOICE_IDENTITY_CLAIM_UNSUPPORTED", recordId: record.assetId, detail: "Voice identity claims require evidence outside this policy contract" });
}

export function auditLanguageRatingVoicePolicy(input: LanguageRatingVoicePolicyInput): LanguageRatingVoicePolicyOutput {
  const rulesVersion = input.rulesVersion ?? LANGUAGE_RATING_VOICE_POLICY_RULES_VERSION;
  if (rulesVersion !== LANGUAGE_RATING_VOICE_POLICY_RULES_VERSION) throw new Error(`Unsupported language rating voice policy rules version: ${rulesVersion}`);
  const issues: LanguageRatingVoicePolicyIssue[] = [];
  const issueCounts = emptyIssueCounts();
  const copy = [...input.copy].sort((left, right) => compareStrings(left.id, right.id));
  const voice = [...input.voice].sort((left, right) => compareStrings(left.assetId, right.assetId));
  const copyIds = new Set<string>();
  for (const record of copy) {
    if (copyIds.has(record.id)) addIssue(issues, { code: "DUPLICATE_COPY_ID", recordId: record.id, detail: `Policy copy ID is duplicated: ${record.id}` });
    copyIds.add(record.id);
    auditCopy(record, issues);
  }
  const voiceAssetIds = new Set<string>();
  for (const record of voice) {
    if (voiceAssetIds.has(record.assetId)) addIssue(issues, { code: "DUPLICATE_VOICE_ASSET_ID", recordId: record.assetId, detail: `Voice asset ID is duplicated: ${record.assetId}` });
    voiceAssetIds.add(record.assetId);
    auditVoice(record, issues);
  }
  if (input.ratingLabel !== "adult-oriented") addIssue(issues, { code: "RATING_LABEL_MISSING", recordId: "rating", detail: "Policy must label the game adult-oriented" });
  if (input.externalCertification !== "not-claimed") addIssue(issues, { code: "EXTERNAL_RATING_CLAIM_UNSUPPORTED", recordId: "rating", detail: "External rating certification is not evidenced by this repository contract" });
  const sortedIssues = issues.sort((left, right) => compareStrings(left.code, right.code) || compareStrings(left.recordId, right.recordId) || compareStrings(left.detail, right.detail));
  for (const issue of sortedIssues) issueCounts[issue.code] += 1;
  const contentHash = hashStableJson({ rulesVersion, ratingLabel: input.ratingLabel, externalCertification: input.externalCertification, copy, voice, issues: sortedIssues } as never);
  return {
    artifact: {
      generatorId: "language.rating-voice-policy",
      generatorVersion: LANGUAGE_RATING_VOICE_POLICY_VERSION,
      rulesVersion: LANGUAGE_RATING_VOICE_POLICY_RULES_VERSION,
      contentHash,
      copyCount: copy.length,
      voiceAssetCount: voice.length,
    },
    summary: {
      valid: sortedIssues.length === 0,
      ratingLabel: input.ratingLabel,
      externalCertification: input.externalCertification,
      thaiCopyCount: copy.filter(record => record.locale === "th-TH").length,
      copyCount: copy.length,
      voiceAssetCount: voice.length,
      distributableVoiceAssetCount: voice.filter(record => isDistributableVoiceStatus(record.licenseStatus)).length,
      issueCounts,
    },
    issues: sortedIssues,
    runtimePolicy: {
      primaryLocale: "th-TH",
      playerSafetyCopyRequired: true,
      voiceOptional: true,
      textFallbackRequired: true,
      externalRatingClaimed: false,
    },
  };
}
