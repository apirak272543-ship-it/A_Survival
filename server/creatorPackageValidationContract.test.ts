import { describe, expect, it } from "vitest";
import { buildCreatorDomainArtifactMetadata, type CreatorDomainArtifactMetadata } from "./creatorDomainArtifactRegistry";
import { PLAYABLE_CREATOR_PACKAGE_MAP_ID, validateCreatorPackageMetadata } from "./creatorPackageValidationContract";

function metadata(overrides: Partial<CreatorDomainArtifactMetadata> = {}): CreatorDomainArtifactMetadata {
  return {
    ...buildCreatorDomainArtifactMetadata({
      domain: "item",
      artifactId: "starter-item-pack",
      artifactVersion: "1.0.0",
      generatorId: "content.catalog",
      generatorVersion: "1.0.0",
      manifest: { assetIds: ["items.seed"], schemaVersion: "a-survival.asset-pack-manifest.v1" },
      summary: { assetCount: 1, runtime: "metadata-only" },
      sources: ["project-original"],
      provenanceRefs: ["starter-item-pack-v1"],
    }),
    ...overrides,
  };
}

describe("creator package validation contract", () => {
  it("accepts canonical metadata for review while keeping publish/runtime disabled", () => {
    const result = validateCreatorPackageMetadata({ artifact: metadata(), targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID });

    expect(result).toMatchObject({
      previewOnly: true,
      targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID,
      decision: "reviewable",
      publishReady: false,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      reasons: [],
    });
    expect(result.metadataHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("blocks future-map targets without changing the canonical artifact", () => {
    const artifact = metadata();
    const result = validateCreatorPackageMetadata({ artifact, targetMapId: "map-002" });

    expect(result.decision).toBe("blocked");
    expect(result.reasons).toEqual([{ code: "FUTURE_MAP_NOT_ALLOWED", detail: "Only obsidian-frontier is an eligible review target; target map-002 is blocked" }]);
    expect(result.artifactKey).toBe(artifact.artifactKey);
  });

  it("reports identity, hash, provenance and runtime-policy blockers", () => {
    const valid = metadata();
    const malformed = {
      ...valid,
      artifactKey: "wrong-key",
      contentSha256: "bad",
      generatorId: "content.other",
      artifactId: "",
      runtimePolicy: { runtimeImportAllowed: true, playerVisible: false, cacheable: false },
      provenance: { ...valid.provenance, generatorId: "content.catalog", generatorVersion: "0.0.0", sources: [], provenanceRefs: [] },
    } as unknown as CreatorDomainArtifactMetadata;
    const result = validateCreatorPackageMetadata({ artifact: malformed, targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID });

    expect(result.decision).toBe("blocked");
    expect(result.reasons.map(reason => reason.code)).toEqual([
      "ARTIFACT_KEY_MISMATCH",
      "CONTENT_HASH_INVALID",
      "IDENTITY_MISMATCH",
      "PROVENANCE_MISSING",
      "RUNTIME_POLICY_ENABLED",
    ]);
  });

  it("rejects binary metadata and bounded-overflow payloads", () => {
    const binary = metadata({ summary: { preview: { pngBase64: "not-an-asset" } } });
    const nested = { value: "leaf" } as Record<string, unknown>;
    let cursor = nested;
    for (let index = 0; index < 520; index += 1) {
      const next: Record<string, unknown> = {};
      cursor.next = next;
      cursor = next;
    }
    const oversized = metadata({ manifest: nested });

    const binaryResult = validateCreatorPackageMetadata({ artifact: binary, targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID });
    const oversizedResult = validateCreatorPackageMetadata({ artifact: oversized, targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID });

    expect(binaryResult.reasons).toEqual([{ code: "BINARY_PAYLOAD_PRESENT", detail: "metadata-only package validation rejects binary payload fields" }]);
    expect(oversizedResult.reasons).toEqual([{ code: "METADATA_BOUNDS_EXCEEDED", detail: "metadata traversal is limited to 512 nodes/depth" }]);
  });

  it("deduplicates reason codes and remains deterministic for identical metadata", () => {
    const artifact = metadata({
      artifactKey: "wrong",
      runtimePolicy: { runtimeImportAllowed: true, playerVisible: true, cacheable: true },
    } as unknown as Partial<CreatorDomainArtifactMetadata>);
    const first = validateCreatorPackageMetadata({ artifact, targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID });
    const second = validateCreatorPackageMetadata({ artifact, targetMapId: PLAYABLE_CREATOR_PACKAGE_MAP_ID });

    expect(second).toEqual(first);
    expect(first.reasons.map(reason => reason.code)).toEqual(["ARTIFACT_KEY_MISMATCH", "RUNTIME_POLICY_ENABLED"]);
  });
});
