import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { isAssetPackManifest, resolveAssetUrl } from "../client/src/game/assets/assetPackLoader";

type ManifestEntry = { kind: string; path: string; sha256?: string; fallback?: string };
type Manifest = { id: string; namespace: string; version: string; entries: Record<string, ManifestEntry>; packSha256?: string };

const packRoot = resolve(process.cwd(), "client/public/assets/packs/arcane-frontier-voxel-pixel");
const manifest = JSON.parse(readFileSync(resolve(packRoot, "manifest.json"), "utf8")) as Manifest;

function sha256(filePath: string) {
  return createHash("sha256").update(readFileSync(filePath)).digest("hex");
}

function sha256Text(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

describe("Arcane asset pack manifest", () => {
  it("declares the original namespace and all articulated model entries", () => {
    expect(manifest.id).toBe("arcane-frontier-voxel-pixel");
    expect(manifest.namespace).toBe("af");
    expect(manifest.version).toBe("0.3.0");
    for (const id of ["models.survivor", "models.companion", "models.enemy", "models.elite", "models.boss"]) {
      expect(manifest.entries[id]?.kind).toBe("model");
    }
  });

  it("declares the Obsidian Frontier art slice as replaceable pack entries", () => {
    for (const id of [
      "art.obsidian.frontier-key-art",
      "art.obsidian.survivor",
      "art.obsidian.companion",
      "art.obsidian.enemy",
      "art.obsidian.crystal-fern",
      "art.obsidian.spore-shrub",
      "art.obsidian.glow-vine",
      "art.obsidian.aether-ore",
      "art.obsidian.shard-cluster",
      "art.obsidian.lumen-bulb",
      "art.obsidian.portal-ruin",
      "art.obsidian.ancient-monolith",
    ]) {
      expect(manifest.entries[id]?.kind).toBe("texture");
      expect(manifest.entries[id]?.path.startsWith("art/")).toBe(true);
    }
  });

  it("keeps every entry inside the pack and matches its file digest", () => {
    for (const entry of Object.values(manifest.entries)) {
      expect(entry.path.startsWith("/")).toBe(false);
      const filePath = resolve(packRoot, entry.path);
      expect(filePath.startsWith(packRoot)).toBe(true);
      expect(existsSync(filePath)).toBe(true);
      expect(entry.sha256).toBe(sha256(filePath));
    }
  });

  it("uses a deterministic hash over the ordered manifest entry digests", () => {
    const expected = sha256Text(Object.values(manifest.entries).map(entry => entry.sha256 ?? "").join(""));
    expect(manifest.packSha256).toBe(expected);
  });

  it("requires versioned metadata and integrity references before runtime use", () => {
    expect(isAssetPackManifest(manifest)).toBe(true);
    expect(isAssetPackManifest({ ...manifest, schemaVersion: 2 })).toBe(false);
    expect(isAssetPackManifest({ ...manifest, packSha256: undefined })).toBe(false);
    expect(isAssetPackManifest({ ...manifest, displayName: "" })).toBe(false);
    expect(isAssetPackManifest({ ...manifest, dependencies: [""] })).toBe(false);

    const missingDigest = { ...manifest.entries["models.survivor"]!, sha256: undefined };
    expect(isAssetPackManifest({ ...manifest, entries: { ...manifest.entries, "models.survivor": missingDigest } })).toBe(false);

    const missingFallback = { ...manifest.entries["models.survivor"]!, fallback: "missing.asset" };
    expect(isAssetPackManifest({ ...manifest, entries: { ...manifest.entries, "models.survivor": missingFallback } })).toBe(false);
  });

  it("rejects unsafe paths and resolves a custom pack base without leaving it", () => {
    expect(isAssetPackManifest({ ...manifest, entries: { bad: { kind: "data", path: "../secret.json", sha256: "a".repeat(64) } } })).toBe(false);
    expect(isAssetPackManifest({ ...manifest, entries: { bad: { kind: "script", path: "safe.json", sha256: "a".repeat(64) } } })).toBe(false);
    expect(isAssetPackManifest({ ...manifest, basePath: "/assets/packs/../custom-pack" })).toBe(false);
    const custom = { ...manifest, basePath: "/assets/packs/custom-pack" };
    expect(resolveAssetUrl(custom, "models.survivor")).toBe("http://localhost/assets/packs/custom-pack/models/survivor.glb");
  });
});
