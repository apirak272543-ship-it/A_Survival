import { describe, expect, it } from "vitest";
import {
  auditLanguageRatingVoicePolicy,
  type LanguageRatingVoicePolicyInput,
  type PolicyCopyRecord,
  type VoiceAssetRecord,
} from "./generators/languageRatingVoicePolicy";

const validCopy: PolicyCopyRecord[] = [
  { id: "system-save", layer: "system", locale: "th-TH", text: "บันทึกข้อมูลแล้ว", containsProfanity: false, usesClearWording: true, disclosure: "none" },
  { id: "safety-delete", layer: "safety", locale: "th-TH", text: "ลบข้อมูลนี้ถาวรและกู้คืนไม่ได้", containsProfanity: false, usesClearWording: true, disclosure: "none" },
  { id: "hud-stamina", layer: "hud", locale: "th-TH", text: "พลังงาน", containsProfanity: false, usesClearWording: true, disclosure: "none" },
  { id: "npc-greeting", layer: "npc", locale: "th-TH", text: "เอาล่ะ ไปกันเถอะ", containsProfanity: false, usesClearWording: true, disclosure: "adult-content" },
  { id: "plant-effect", layer: "plant-effect", locale: "th-TH", text: "เอฟเฟกต์นี้เป็นจินตนาการในเกม ไม่ใช่คำแนะนำทางการแพทย์", containsProfanity: false, usesClearWording: true, disclosure: "fictional-effect" },
  { id: "credits", layer: "credits", locale: "th-TH", text: "ที่มาและเครดิต", containsProfanity: false, usesClearWording: true, disclosure: "none" },
];

const validVoice: VoiceAssetRecord[] = [
  { assetId: "voice.npc.greeting", licenseStatus: "project-original", provenanceRef: "docs/VOICE_ASSETS.md#npc-greeting", hasTextFallback: true },
];

function validInput(overrides: Partial<LanguageRatingVoicePolicyInput> = {}): LanguageRatingVoicePolicyInput {
  return { ratingLabel: "adult-oriented", externalCertification: "not-claimed", copy: validCopy, voice: validVoice, ...overrides };
}

describe("language rating voice policy", () => {
  it("accepts the bounded adult-oriented policy with Thai safety copy and optional provenance-backed voice", () => {
    const result = auditLanguageRatingVoicePolicy(validInput());
    expect(result.summary.valid).toBe(true);
    expect(result.summary.thaiCopyCount).toBe(6);
    expect(result.summary.distributableVoiceAssetCount).toBe(1);
    expect(result.issues).toEqual([]);
    expect(result.runtimePolicy).toEqual({
      primaryLocale: "th-TH",
      playerSafetyCopyRequired: true,
      voiceOptional: true,
      textFallbackRequired: true,
      externalRatingClaimed: false,
    });
  });

  it("rejects unsupported rating claims and unsafe or incomplete system policy copy", () => {
    const copy = validCopy.map(record => record.id === "system-save"
      ? { ...record, containsProfanity: true, usesClearWording: false }
      : record.id === "safety-delete"
        ? { ...record, locale: "en-US", text: "", usesClearWording: false }
        : record);
    const result = auditLanguageRatingVoicePolicy(validInput({ ratingLabel: "teen", externalCertification: "verified", copy }));
    expect(result.summary.valid).toBe(false);
    expect(result.summary.issueCounts.RATING_LABEL_MISSING).toBe(1);
    expect(result.summary.issueCounts.EXTERNAL_RATING_CLAIM_UNSUPPORTED).toBe(1);
    expect(result.summary.issueCounts.PRIMARY_COPY_NOT_THAI).toBe(1);
    expect(result.summary.issueCounts.COPY_TEXT_MISSING).toBe(1);
    expect(result.summary.issueCounts.SYSTEM_COPY_PROFANITY).toBe(1);
    expect(result.summary.issueCounts.SYSTEM_COPY_UNCLEAR).toBe(2);
  });

  it("requires fictional disclosure for plant effects", () => {
    const copy = validCopy.map(record => record.id === "plant-effect" ? { ...record, disclosure: "none" as const } : record);
    const result = auditLanguageRatingVoicePolicy(validInput({ copy }));
    expect(result.summary.issueCounts.PLANT_EFFECT_DISCLOSURE_MISSING).toBe(1);
    expect(result.summary.valid).toBe(false);
  });

  it("fails closed for voice provenance, license, text fallback, and identity claims", () => {
    const voice: VoiceAssetRecord[] = [
      { assetId: "voice.npc.unverified", licenseStatus: "awaiting-contact", hasTextFallback: false, identityClaim: "named performer" },
    ];
    const result = auditLanguageRatingVoicePolicy(validInput({ voice }));
    expect(result.summary.issueCounts.VOICE_PROVENANCE_MISSING).toBe(1);
    expect(result.summary.issueCounts.VOICE_LICENSE_UNVERIFIED).toBe(1);
    expect(result.summary.issueCounts.VOICE_TEXT_FALLBACK_MISSING).toBe(1);
    expect(result.summary.issueCounts.VOICE_IDENTITY_CLAIM_UNSUPPORTED).toBe(1);
    expect(result.summary.distributableVoiceAssetCount).toBe(0);
  });

  it("keeps output deterministic across input order and changes hash when policy input changes", () => {
    const input = validInput();
    const first = auditLanguageRatingVoicePolicy(input);
    const reordered = auditLanguageRatingVoicePolicy({ ...input, copy: [...input.copy].reverse(), voice: [...input.voice].reverse() });
    expect(reordered).toEqual(first);
    const changed = auditLanguageRatingVoicePolicy({ ...input, copy: input.copy.map(record => record.id === "hud-stamina" ? { ...record, text: "พลังชีวิต" } : record) });
    expect(changed.artifact.contentHash).not.toBe(first.artifact.contentHash);
  });

  it("rejects unsupported rules versions", () => {
    expect(() => auditLanguageRatingVoicePolicy(validInput({ rulesVersion: "unsupported" }))).toThrow("Unsupported language rating voice policy rules version");
  });
});
