import { describe, expect, it } from "vitest";
import { buildTexturePack, solidRgba } from "./generators/texturePackBuilder";
import { buildCreatorArtifactMetadata, makeCreatorArtifactKey } from "./creatorArtifactRegistry";

function buildOutput() {
  return buildTexturePack({
    id: "creator-registry-test",
    namespace: "creator",
    version: "0.1.0",
    displayName: "Creator Registry Test",
    textureSampling: "nearest",
    assets: [{
      assetId: "obsidian-icon",
      kind: "icon",
      width: 2,
      height: 2,
      layers: [{ id: "base", x: 0, y: 0, width: 2, height: 2, rgba: solidRgba(2, 2, [28, 20, 48, 255]) }],
      source: "starter-authored",
      provenanceRef: "creator-registry-test",
    }],
  });
}

describe("creator artifact registry metadata", () => {
  it("creates a stable artifact key from the verified pack hash", () => {
    const output = buildOutput();
    expect(makeCreatorArtifactKey(output)).toBe(`texture-pack:creator-registry-test:0.1.0:${output.manifest.packSha256}`);
    expect(makeCreatorArtifactKey(output)).toBe(makeCreatorArtifactKey(buildOutput()));
  });

  it("keeps PNG bytes out of registry metadata while retaining provenance", () => {
    const output = buildOutput();
    const metadata = buildCreatorArtifactMetadata(output);
    const asset = metadata.assets["obsidian-icon"]!;

    expect(metadata.kind).toBe("texture-pack");
    expect(metadata.packSha256).toBe(output.manifest.packSha256);
    expect(asset.sha256).toBe(output.assets[0]!.sha256);
    expect(asset.mime).toBe("image/png");
    expect(asset).not.toHaveProperty("pngBase64");
    expect(metadata.provenance).toMatchObject({
      schemaVersion: "a-survival.creator-artifact.v1",
      generatorId: "texture.pack",
      usage: "developer-registry-only; not automatically imported by playable runtime",
    });
    expect(metadata.provenance.sources).toEqual(["starter-authored"]);
    expect(metadata.provenance.provenanceRefs).toEqual(["creator-registry-test"]);
  });
});
