import { describe, expect, it } from "vitest";
import type { CreatorDomainArtifact } from "../drizzle/schema";
import { PLAYABLE_RUNTIME_MAP_ID, validateCreatorDomainArtifactCompatibility } from "./creatorDomainArtifactCompatibility";

function artifact(overrides: Partial<CreatorDomainArtifact> = {}): CreatorDomainArtifact {
  return {
    id: 7,
    artifactKey: "animation:survivor.default:0.1.0:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    domain: "animation",
    artifactId: "survivor.default",
    artifactVersion: "0.1.0",
    generatorId: "animation.profile",
    generatorVersion: "1.0.0",
    contentSha256: "a".repeat(64),
    manifest: { states: ["idle", "walk"] },
    summary: { stateCount: 2 },
    provenance: { schemaVersion: "a-survival.creator-domain-artifact.v1", generatorId: "animation.profile", generatorVersion: "1.0.0", sources: ["starter-authored"], provenanceRefs: ["procedural-starter-authored"] },
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    reviewStatus: "approved",
    reviewNote: "ผ่านการตรวจ metadata",
    reviewedByUserId: 2,
    reviewedAt: new Date("2026-08-27T00:00:00.000Z"),
    createdByUserId: 2,
    createdAt: new Date("2026-08-26T00:00:00.000Z"),
    updatedAt: new Date("2026-08-27T00:00:00.000Z"),
    ...overrides,
  };
}

describe("creator domain artifact compatibility", () => {
  it("allows only an approved metadata candidate for Obsidian review", () => {
    const result = validateCreatorDomainArtifactCompatibility({ artifact: artifact(), targetMapId: PLAYABLE_RUNTIME_MAP_ID });
    expect(result).toMatchObject({ previewOnly: true, decision: "reviewable", targetMapId: PLAYABLE_RUNTIME_MAP_ID, publishReady: false, runtimeImportAllowed: false, reasons: [] });
  });

  it("blocks future map targets and non-approved records", () => {
    const result = validateCreatorDomainArtifactCompatibility({ artifact: artifact({ reviewStatus: "draft" }), targetMapId: "map-002" });
    expect(result.decision).toBe("blocked");
    expect(result.reasons.map(reason => reason.code)).toEqual(expect.arrayContaining(["FUTURE_MAP_NOT_ALLOWED", "REVIEW_NOT_APPROVED"]));
  });

  it("returns strict reasons for malformed metadata and enabled runtime policy", () => {
    const result = validateCreatorDomainArtifactCompatibility({
      artifact: artifact({
        contentSha256: "bad",
        reviewedByUserId: null,
        reviewedAt: null,
        runtimePolicy: { runtimeImportAllowed: true, playerVisible: false, cacheable: false },
        provenance: { sources: [] },
        summary: { nested: { pngBase64: "blocked" } },
      }),
      targetMapId: PLAYABLE_RUNTIME_MAP_ID,
    });
    expect(result.decision).toBe("blocked");
    expect(result.reasons.map(reason => reason.code)).toEqual(expect.arrayContaining(["REVIEW_AUDIT_MISSING", "RUNTIME_POLICY_ENABLED", "CONTENT_HASH_INVALID", "PROVENANCE_MISSING", "BINARY_PAYLOAD_PRESENT"]));
  });
});
