import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACTIVE_GAMEPLAY_PACK_ID,
  ACTIVE_GAMEPLAY_PACK_ROOT,
  auditActiveArcaneFrontierPack,
  auditAssetPackProvenance,
} from "./generators/runtimeAssetProvenanceAudit";
import { ASSET_CREDITS } from "../client/src/game/data/assetProvenance";

type Manifest = {
  id: string;
  namespace: string;
  version: string;
  entries: Record<string, { kind: string; path: string; sha256?: string; fallback?: string }>;
  packSha256?: string;
};

const packRoot = resolve(process.cwd(), ACTIVE_GAMEPLAY_PACK_ROOT);
const manifest = JSON.parse(readFileSync(resolve(packRoot, "manifest.json"), "utf8")) as Manifest;

describe("runtime asset provenance audit", () => {
  it("verifies every active gameplay entry against its on-disk SHA and pack hash", () => {
    const result = auditActiveArcaneFrontierPack(packRoot);

    expect(result.artifact.packId).toBe(ACTIVE_GAMEPLAY_PACK_ID);
    expect(result.manifest.namespace).toBe("af");
    expect(result.manifest.entryCount).toBe(Object.keys(manifest.entries).length);
    expect(result.manifest.packShaVerified).toBe(true);
    expect(result.summary).toMatchObject({
      valid: true,
      bounded: true,
      deterministic: true,
      entryCount: Object.keys(manifest.entries).length,
      verifiedFileCount: Object.keys(manifest.entries).length,
      missingFileCount: 0,
      hashMismatchCount: 0,
      referenceOnlyRuntimeCount: 0,
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    });
    expect(result.entries.every(entry => entry.fileExists && entry.hashVerified && entry.runtimeAllowed)).toBe(true);
  });

  it("keeps project pack credit distributable while isolating reference-only credits", () => {
    const result = auditActiveArcaneFrontierPack(packRoot);

    expect(result.credits).toEqual({
      packCreditAssetId: "pack.arcane-frontier-voxel-pixel",
      packCreditStatus: "project-original",
      packCreditDistributable: true,
      referenceOnlyCreditIds: ["reference.minecraft-tree-rules", "reference.terraria.biomes"],
      referenceOnlyOutsideRuntime: true,
    });
    expect(result.blockers.map(blocker => blocker.id)).toEqual(["credits-ui-contact-workflow", "per-entry-provenance-granularity"]);
    expect(result.claims).toEqual({
      runtimeWrite: false,
      generatorCall: false,
      assetGeneration: false,
      cacheWrite: false,
      runtimePublish: false,
      creditsUi: false,
      deviceAcceptance: false,
    });
  });

  it("is deterministic and changes its content hash when the manifest changes", () => {
    const first = auditActiveArcaneFrontierPack(packRoot);
    const second = auditActiveArcaneFrontierPack(packRoot);
    const changed = auditAssetPackProvenance({
      manifest: { ...manifest, namespace: "af2" },
      packRoot,
      expectedPackId: ACTIVE_GAMEPLAY_PACK_ID,
    });

    expect(first).toEqual(second);
    expect(changed.artifact.contentHash).not.toBe(first.artifact.contentHash);
    expect(first.artifact.contentHash).toMatch(/^[a-f0-9]{64}$/);
  });

  it("returns explicit blockers and issues for unsafe, missing, tampered, and reference-only entries", () => {
    const tamperedManifest: Manifest = {
      ...manifest,
      entries: {
        ...manifest.entries,
        "bad.reference": { kind: "script", path: "../secret.js", sha256: "invalid" },
        "bad.missing": { kind: "texture", path: "textures/missing.png", sha256: "0".repeat(64) },
      },
      packSha256: "0".repeat(64),
    };
    const result = auditAssetPackProvenance({
      manifest: tamperedManifest,
      packRoot,
      expectedPackId: ACTIVE_GAMEPLAY_PACK_ID,
      credits: [
        ...ASSET_CREDITS,
        { ...ASSET_CREDITS[1]!, assetId: "bad.reference", status: "reference-only" },
      ],
    });
    const issueCodes = result.issues.map(issue => issue.code);

    expect(result.summary.valid).toBe(false);
    expect(issueCodes).toEqual(expect.arrayContaining([
      "ENTRY_KIND_UNSUPPORTED",
      "ENTRY_PATH_UNSAFE",
      "ENTRY_SHA_INVALID",
      "ENTRY_FILE_MISSING",
      "PACK_SHA_MISMATCH",
      "REFERENCE_ONLY_RUNTIME_ENTRY",
    ]));
    expect(result.entries.find(entry => entry.assetId === "bad.reference")).toMatchObject({ fileExists: false, hashVerified: false, runtimeAllowed: false });
    expect(result.entries.find(entry => entry.assetId === "bad.missing")).toMatchObject({ fileExists: false, hashVerified: false, runtimeAllowed: false });
  });

  it("fails closed when the pack credit is missing or not distributable", () => {
    const noPackCredit = auditAssetPackProvenance({ manifest, packRoot, credits: ASSET_CREDITS.filter(credit => credit.assetId !== "pack.arcane-frontier-voxel-pixel") });
    const referencePackCredit = auditAssetPackProvenance({
      manifest,
      packRoot,
      credits: [{ ...ASSET_CREDITS[0]!, status: "reference-only" }, ...ASSET_CREDITS.slice(1)],
    });

    expect(noPackCredit.issues.map(issue => issue.code)).toContain("PACK_CREDIT_MISSING");
    expect(noPackCredit.entries.every(entry => entry.runtimeAllowed === false)).toBe(true);
    expect(referencePackCredit.issues.map(issue => issue.code)).toContain("PACK_CREDIT_NOT_DISTRIBUTABLE");
    expect(referencePackCredit.entries.every(entry => entry.runtimeAllowed === false)).toBe(true);
  });
});
