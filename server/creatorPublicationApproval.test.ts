import { describe, expect, it } from "vitest";
import { hashStableJson } from "./generators/commonGeneratorApi";
import {
  auditCreatorPublicationApproval,
  CREATOR_ARTIFACT_USAGE,
  type CreatorPublicationApprovalInput,
} from "./generators/creatorPublicationApproval";

const assetId = "content.hero";
const assetSha256 = "a".repeat(64);
const manifestWithoutHash = {
  schemaVersion: "a-survival.texture-pack.v1" as const,
  id: "creator-pack",
  namespace: "creator",
  version: "1.0.0",
  displayName: "Creator test pack",
  textureSampling: "nearest" as const,
  entries: {
    [assetId]: {
      kind: "icon" as const,
      path: "icons/content.hero.png",
      mime: "image/png" as const,
      sha256: assetSha256,
      source: "starter-authored" as const,
      provenanceRef: "docs/ASSETS.md#hero",
    },
  },
};
const packSha256 = hashStableJson(manifestWithoutHash as never);
const manifest = { ...manifestWithoutHash, packSha256 };

function validInput(overrides: Partial<CreatorPublicationApprovalInput> = {}): CreatorPublicationApprovalInput {
  return {
    artifact: {
      artifactKey: `texture-pack:${manifest.id}:${manifest.version}:${packSha256}`,
      kind: "texture-pack",
      packId: manifest.id,
      packVersion: manifest.version,
      packSha256,
      manifest,
      assets: {
        [assetId]: {
          assetId,
          relativePath: "icons/content.hero.png",
          sha256: assetSha256,
          mime: "image/png",
        },
      },
      provenance: {
        schemaVersion: "a-survival.creator-artifact.v1",
        generatorId: "texture.pack",
        generatorVersion: "1.0.0",
        sources: ["starter-authored"],
        provenanceRefs: ["docs/ASSETS.md#hero"],
        usage: CREATOR_ARTIFACT_USAGE,
      },
    },
    reviewStatus: "approved",
    ...overrides,
  };
}

describe("creator publication approval", () => {
  it("approves a complete manifest/hash/provenance/review package while keeping runtime import disabled", () => {
    const result = auditCreatorPublicationApproval(validInput());
    expect(result.summary.valid).toBe(true);
    expect(result.summary.assetCount).toBe(1);
    expect(result.issues).toEqual([]);
    expect(result.runtimePolicy).toEqual({
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
      databaseWrite: false,
      storageWrite: false,
    });
  });

  it("rejects key, manifest, pack-hash, asset, provenance, and review mismatches", () => {
    const input = validInput({
      reviewStatus: "draft",
      artifact: {
        ...validInput().artifact,
        artifactKey: "wrong-key",
        packId: "different-pack",
        manifest: {
          ...manifest,
          id: "creator-pack",
          entries: { [assetId]: { ...manifest.entries[assetId]!, path: "icons/changed.png", sha256: "b".repeat(64), source: "reference-only", provenanceRef: "" } },
          packSha256: "c".repeat(64),
        },
        packSha256: "d".repeat(64),
        assets: {
          [assetId]: { ...validInput().artifact.assets[assetId]!, relativePath: "icons/wrong.png", sha256: "e".repeat(64) },
          "extra.asset": { assetId: "extra.asset", relativePath: "icons/extra.png", sha256: "f".repeat(64), mime: "image/png" },
        },
        provenance: {
          ...validInput().artifact.provenance,
          schemaVersion: "wrong" as never,
          generatorId: "wrong" as never,
          usage: "player-runtime" as never,
          sources: [],
          provenanceRefs: [],
        },
      },
    });
    const result = auditCreatorPublicationApproval(input);
    expect(result.summary.valid).toBe(false);
    expect(result.summary.issueCounts.ARTIFACT_KEY_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.MANIFEST_ID_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.PACK_HASH_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.ASSET_SET_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.ASSET_PATH_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.ASSET_HASH_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.ASSET_PROVENANCE_MISSING).toBe(1);
    expect(result.summary.issueCounts.PROVENANCE_SCHEMA_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.PROVENANCE_GENERATOR_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.PROVENANCE_USAGE_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.PROVENANCE_SOURCES_MISSING).toBe(1);
    expect(result.summary.issueCounts.PROVENANCE_REFS_MISSING).toBe(1);
    expect(result.summary.issueCounts.REVIEW_NOT_APPROVED).toBe(1);
  });

  it("requires every manifest-backed asset to retain provenance even when the pack hash is valid", () => {
    const entry = { ...manifest.entries[assetId]!, provenanceRef: "" };
    const changedManifestWithoutHash = { ...manifestWithoutHash, entries: { [assetId]: entry } };
    const changedManifest = { ...changedManifestWithoutHash, packSha256: hashStableJson(changedManifestWithoutHash as never) };
    const result = auditCreatorPublicationApproval(validInput({
      artifact: {
        ...validInput().artifact,
        manifest: changedManifest,
        packSha256: changedManifest.packSha256,
        artifactKey: `texture-pack:${changedManifest.id}:${changedManifest.version}:${changedManifest.packSha256}`,
        assets: { [assetId]: { ...validInput().artifact.assets[assetId]! } },
      },
    }));
    expect(result.summary.issueCounts.ASSET_PROVENANCE_MISSING).toBe(1);
  });

  it("keeps output deterministic across object insertion order and changes hash when approval input changes", () => {
    const input = validInput();
    const first = auditCreatorPublicationApproval(input);
    const reordered = auditCreatorPublicationApproval({
      ...input,
      artifact: {
        ...input.artifact,
        assets: Object.fromEntries(Object.entries(input.artifact.assets).reverse()),
        manifest: { ...input.artifact.manifest, entries: Object.fromEntries(Object.entries(input.artifact.manifest.entries).reverse()) },
      },
    });
    expect(reordered).toEqual(first);
    const changed = auditCreatorPublicationApproval({ ...input, reviewStatus: "rejected" });
    expect(changed.artifact.contentHash).not.toBe(first.artifact.contentHash);
  });

  it("rejects unsupported rules versions", () => {
    expect(() => auditCreatorPublicationApproval(validInput({ rulesVersion: "unsupported" }))).toThrow("Unsupported creator publication approval rules version");
  });
});
