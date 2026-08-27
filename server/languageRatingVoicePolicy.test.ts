import { describe, expect, it } from "vitest";
import {
  createDefaultLanguageRatingVoicePolicy,
  evaluateLanguageRatingVoicePolicy,
  MAX_SAFETY_COPY_ENTRIES,
  MAX_VOICE_ASSETS,
} from "./languageRatingVoicePolicy";

const baseInput = {
  disclosure: "เกมนี้ออกแบบสำหรับผู้เล่นโตขึ้น บทพูดอาจเป็นภาษากันเองและเสียงเป็นระบบเสริม",
  safetyCopy: ["อ่านข้อความสำคัญได้แม้ปิดเสียง", "อย่าใช้คำเตือนนี้แทนข้อมูลบัญชีหรือความปลอดภัย"],
};

describe("language rating and voice policy", () => {
  it("creates a Thai-first adult-oriented policy without an external certification claim", () => {
    const result = createDefaultLanguageRatingVoicePolicy(baseInput);

    expect(result).toMatchObject({
      policyVersion: "language-rating-voice-policy.v1",
      valid: true,
      rating: { label: "สำหรับผู้เล่นโตขึ้น", externalCertificationClaim: false },
      language: { defaultLocale: "th", systemCopy: "clear-colloquial-thai", englishLocaleStatus: "preparation" },
      voice: { optional: true, requiredForRules: false, reviewedRuntimeAssetIds: [], referenceOnlyAssetIds: [] },
    });
    expect(result.issues).toEqual([]);
  });

  it("accepts reviewed voice assets and keeps reference-only assets out of runtime", () => {
    const result = createDefaultLanguageRatingVoicePolicy({
      ...baseInput,
      voiceAssets: [
        { assetId: "voice.npc.guide", source: "project-original", path: "audio/guide.ogg", provenanceRef: "docs/voice/guide.md", runtimeAllowed: true },
        { assetId: "voice.reference.sample", source: "reference-only", path: "refs/sample.ogg", provenanceRef: "docs/voice/sample.md", runtimeAllowed: false },
        { assetId: "voice.npc.guard", source: "license-verified", path: "audio/guard.ogg", license: "CC-BY-4.0", provenanceRef: "docs/voice/guard-license.md", runtimeAllowed: true },
      ],
    });

    expect(result.valid).toBe(true);
    expect(result.voice.reviewedRuntimeAssetIds).toEqual(["voice.npc.guard", "voice.npc.guide"]);
    expect(result.voice.referenceOnlyAssetIds).toEqual(["voice.reference.sample"]);
  });

  it("rejects unsafe disclosure and incomplete or misclassified voice provenance", () => {
    const result = evaluateLanguageRatingVoicePolicy({
      ...baseInput,
      ratingLabel: "สำหรับทุกวัย",
      disclosure: "เนื้อหานี้ผ่านการรับรองเรตแล้ว",
      voiceAssets: [
        { assetId: "voice.reference.sample", source: "reference-only", runtimeAllowed: true },
        { assetId: "voice.licensed", source: "license-verified", path: "audio/licensed.ogg", provenanceRef: "docs/license.md", runtimeAllowed: true },
        { assetId: "voice.licensed", source: "license-verified", path: "audio/duplicate.ogg", license: "CC0", provenanceRef: "docs/duplicate.md", runtimeAllowed: true },
      ],
    });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining([
      "ratingLabel must be สำหรับผู้เล่นโตขึ้น",
      "disclosure must not claim external rating certification",
      "voice asset needs a path: voice.reference.sample",
      "voice asset needs provenanceRef: voice.reference.sample",
      "reference-only voice asset cannot be runtimeAllowed: voice.reference.sample",
      "license-verified voice asset needs license: voice.licensed",
      "duplicate voice asset ID: voice.licensed",
    ]));
  });

  it("rejects empty and unbounded policy inputs", () => {
    expect(() => createDefaultLanguageRatingVoicePolicy({ ...baseInput, disclosure: " " })).toThrow("disclosure must not be empty");
    expect(() => createDefaultLanguageRatingVoicePolicy({ ...baseInput, safetyCopy: [] })).toThrow("safetyCopy must contain 1 to 32 entries");
    expect(() => createDefaultLanguageRatingVoicePolicy({ ...baseInput, safetyCopy: Array.from({ length: MAX_SAFETY_COPY_ENTRIES + 1 }, () => "copy") })).toThrow("safetyCopy must contain 1 to 32 entries");
    expect(() => createDefaultLanguageRatingVoicePolicy({ ...baseInput, voiceAssets: Array.from({ length: MAX_VOICE_ASSETS + 1 }, (_, index) => ({ assetId: `voice.${index}`, source: "project-original" as const, path: `audio/${index}.ogg`, provenanceRef: `docs/${index}.md`, runtimeAllowed: true })) })).toThrow("voiceAssets must contain at most 64 entries");
  });
});
