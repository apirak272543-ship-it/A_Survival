export const LANGUAGE_RATING_VOICE_POLICY_VERSION = "language-rating-voice-policy.v1" as const;
export const MAX_SAFETY_COPY_ENTRIES = 32;
export const MAX_VOICE_ASSETS = 64;

export type VoiceAssetSource = "project-original" | "license-verified" | "reference-only";

export type VoiceAssetProvenance = {
  assetId: string;
  source: VoiceAssetSource;
  path?: string;
  license?: string;
  provenanceRef?: string;
  runtimeAllowed: boolean;
};

export type LanguageRatingVoicePolicyInput = {
  ratingLabel: string;
  disclosure: string;
  safetyCopy: readonly string[];
  voiceAssets?: readonly VoiceAssetProvenance[];
};

export type LanguageRatingVoicePolicyResult = {
  policyVersion: typeof LANGUAGE_RATING_VOICE_POLICY_VERSION;
  valid: boolean;
  issues: string[];
  rating: {
    label: string;
    externalCertificationClaim: false;
  };
  language: {
    defaultLocale: "th";
    systemCopy: "clear-colloquial-thai";
    englishLocaleStatus: "preparation";
  };
  voice: {
    optional: true;
    requiredForRules: false;
    reviewedRuntimeAssetIds: string[];
    referenceOnlyAssetIds: string[];
  };
};

const DEFAULT_RATING_LABEL = "สำหรับผู้เล่นโตขึ้น";
const MAX_TEXT_LENGTH = 500;

function normalizeText(value: string, field: string) {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${field} must not be empty`);
  if (normalized.length > MAX_TEXT_LENGTH) throw new Error(`${field} must be at most ${MAX_TEXT_LENGTH} characters`);
  return normalized;
}

function validateVoiceAsset(asset: VoiceAssetProvenance, seen: Set<string>, issues: string[]) {
  const assetId = asset.assetId.trim();
  if (!assetId) {
    issues.push("voice asset is missing assetId");
    return;
  }
  if (seen.has(assetId)) {
    issues.push(`duplicate voice asset ID: ${assetId}`);
    return;
  }
  seen.add(assetId);
  if (!asset.path?.trim()) issues.push(`voice asset needs a path: ${assetId}`);
  if (!asset.provenanceRef?.trim()) issues.push(`voice asset needs provenanceRef: ${assetId}`);
  if (asset.source === "license-verified" && !asset.license?.trim()) issues.push(`license-verified voice asset needs license: ${assetId}`);
  if (asset.source === "reference-only" && asset.runtimeAllowed) issues.push(`reference-only voice asset cannot be runtimeAllowed: ${assetId}`);
  if (asset.source !== "reference-only" && !asset.runtimeAllowed) issues.push(`reviewed voice asset must be runtimeAllowed: ${assetId}`);
}

export function evaluateLanguageRatingVoicePolicy(input: LanguageRatingVoicePolicyInput): LanguageRatingVoicePolicyResult {
  const ratingLabel = normalizeText(input.ratingLabel, "ratingLabel");
  const disclosure = normalizeText(input.disclosure, "disclosure");
  if (input.safetyCopy.length < 1 || input.safetyCopy.length > MAX_SAFETY_COPY_ENTRIES) throw new Error(`safetyCopy must contain 1 to ${MAX_SAFETY_COPY_ENTRIES} entries`);
  const safetyCopy = input.safetyCopy.map((copy, index) => normalizeText(copy, `safetyCopy[${index}]`));
  const voiceAssets = input.voiceAssets ?? [];
  if (voiceAssets.length > MAX_VOICE_ASSETS) throw new Error(`voiceAssets must contain at most ${MAX_VOICE_ASSETS} entries`);

  const issues: string[] = [];
  if (ratingLabel !== DEFAULT_RATING_LABEL) issues.push(`ratingLabel must be ${DEFAULT_RATING_LABEL}`);
  if (disclosure.includes("รับรองเรต") || disclosure.includes("certified rating")) issues.push("disclosure must not claim external rating certification");
  const seenAssetIds = new Set<string>();
  const reviewedRuntimeAssetIds: string[] = [];
  const referenceOnlyAssetIds: string[] = [];
  for (const asset of voiceAssets) {
    validateVoiceAsset(asset, seenAssetIds, issues);
    if (asset.source === "reference-only") referenceOnlyAssetIds.push(asset.assetId.trim());
    if (asset.source !== "reference-only" && asset.runtimeAllowed) reviewedRuntimeAssetIds.push(asset.assetId.trim());
  }

  return {
    policyVersion: LANGUAGE_RATING_VOICE_POLICY_VERSION,
    valid: issues.length === 0,
    issues,
    rating: { label: ratingLabel, externalCertificationClaim: false },
    language: { defaultLocale: "th", systemCopy: "clear-colloquial-thai", englishLocaleStatus: "preparation" },
    voice: {
      optional: true,
      requiredForRules: false,
      reviewedRuntimeAssetIds: reviewedRuntimeAssetIds.sort(),
      referenceOnlyAssetIds: referenceOnlyAssetIds.sort(),
    },
  };
}

export function createDefaultLanguageRatingVoicePolicy(input: Omit<LanguageRatingVoicePolicyInput, "ratingLabel"> & { ratingLabel?: string }): LanguageRatingVoicePolicyResult {
  return evaluateLanguageRatingVoicePolicy({ ...input, ratingLabel: input.ratingLabel ?? DEFAULT_RATING_LABEL });
}
