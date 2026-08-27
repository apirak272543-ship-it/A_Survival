import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { AssetPackManifest } from "../client/src/game/assets/assetPackLoader";
import {
  ACTIVE_RUNTIME_ASSET_PACK_ID,
  evaluateRuntimeAssetPackBoundary,
  MAX_REQUIRED_ASSET_IDS,
} from "./runtimeAssetPackBoundaryContract";

const activeManifest = JSON.parse(readFileSync("client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json", "utf8")) as AssetPackManifest;

function evaluate(overrides: Partial<Parameters<typeof evaluateRuntimeAssetPackBoundary>[0]> = {}) {
  return evaluateRuntimeAssetPackBoundary({
    manifest: activeManifest,
    requiredAssetIds: ["entities.survivor", "models.survivor", "data.atlas"],
    ...overrides,
  });
}

describe("runtime asset pack boundary contract", () => {
  it("accepts the active manifest when every entry has safe path and SHA evidence", () => {
    const result = evaluate();

    expect(result.valid).toBe(true);
    expect(result.runtimeImportAllowed).toBe(true);
    expect(result.manifest).toMatchObject({ id: ACTIVE_RUNTIME_ASSET_PACK_ID, version: "0.3.0", entryCount: 39 });
    expect(result.summary).toMatchObject({
      entryCount: 39,
      requiredAssetCount: 3,
      requiredAssetMissingCount: 0,
      sha256PresentCount: 39,
      invalidSha256Count: 0,
      fallbackMissingCount: 0,
    });
    expect(result.manifest.manifestHash).toHaveLength(64);
    expect(result.entries.every(entry => entry.runtimeEligible)).toBe(true);
  });

  it("is deterministic and normalizes required asset IDs", () => {
    const first = evaluate({ requiredAssetIds: ["models.survivor", "entities.survivor", "models.survivor"] });
    const second = evaluate({ requiredAssetIds: ["models.survivor", "entities.survivor", "models.survivor"] });

    expect(second).toEqual(first);
    expect(first.summary.requiredAssetCount).toBe(2);
  });

  it("fails closed for missing SHA, unsafe paths, invalid fallback and unknown assets", () => {
    const manifest = {
      ...activeManifest,
      entries: {
        ...activeManifest.entries,
        "broken.entry": { kind: "texture", path: "../escape.png", fallback: "missing.fallback" },
        "invalid.kind": { kind: "model/unknown", path: "models/unknown.glb", sha256: "not-a-sha" },
      },
    } as AssetPackManifest;
    const result = evaluate({ manifest, requiredAssetIds: ["missing.required"] });

    expect(result.valid).toBe(false);
    expect(result.runtimeImportAllowed).toBe(false);
    expect(result.summary.invalidSha256Count).toBe(1);
    expect(result.summary.fallbackMissingCount).toBe(1);
    expect(result.summary.requiredAssetMissingCount).toBe(1);
    expect(result.issues).toEqual(expect.arrayContaining([
      "asset entry is missing sha256: broken.entry",
      "asset entry has unsafe relative path: broken.entry",
      "asset entry fallback is missing: broken.entry -> missing.fallback",
      "asset entry has unsupported kind: invalid.kind",
      "asset entry has invalid sha256: invalid.kind",
      "required runtime asset is missing from manifest: missing.required",
    ]));
  });

  it("rejects future packs and unbounded required asset lists", () => {
    expect(evaluate({ manifest: { ...activeManifest, id: "future-pack" } })).toMatchObject({ valid: false, runtimeImportAllowed: false });
    expect(evaluate({ manifest: { ...activeManifest, packSha256: "invalid" } })).toMatchObject({ valid: false, runtimeImportAllowed: false });
    expect(() => evaluate({ requiredAssetIds: Array.from({ length: MAX_REQUIRED_ASSET_IDS + 1 }, (_, index) => `asset-${index}`) })).toThrow("requiredAssetIds must contain at most 64 entries");
  });
});
