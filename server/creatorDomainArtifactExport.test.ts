import { describe, expect, it } from "vitest";
import { buildCreatorDomainArtifactExport } from "./creatorDomainArtifactExport";
import type { CreatorDomainArtifact } from "../drizzle/schema";

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
    provenance: { schemaVersion: "a-survival.creator-domain-artifact.v1", sources: ["starter-authored"] },
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

describe("creator domain artifact export", () => {
  it("exports approved metadata only and keeps runtime disabled", () => {
    const result = buildCreatorDomainArtifactExport(artifact());
    expect(result).toMatchObject({ exportOnly: true, publishReady: false, assets: [], review: { status: "approved", reviewedByUserId: 2 }, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } });
    expect(result.manifest).toEqual({ states: ["idle", "walk"] });
    expect(result).not.toHaveProperty("pngBase64");
  });

  it("rejects draft or rejected artifacts before creating an export", () => {
    expect(() => buildCreatorDomainArtifactExport(artifact({ reviewStatus: "draft" }))).toThrow("Only approved");
    expect(() => buildCreatorDomainArtifactExport(artifact({ reviewStatus: "rejected" }))).toThrow("Only approved");
  });

  it("rejects approved records missing reviewer fields or with an enabled runtime policy", () => {
    expect(() => buildCreatorDomainArtifactExport(artifact({ reviewedByUserId: null }))).toThrow("missing reviewer audit");
    expect(() => buildCreatorDomainArtifactExport(artifact({ runtimePolicy: { runtimeImportAllowed: true, playerVisible: false, cacheable: false } }))).toThrow("runtime policy");
  });
});
