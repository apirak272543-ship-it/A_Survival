import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { buildCreatorComposition } from "./creatorCompositionBuilder";
import { buildCompositionTextureInput } from "./creatorCompositionTextureAdapter";
import { validateCreatorCompositionTextureExport } from "./creatorCompositionTextureCompatibility";
import { buildCreatorCompositionTextureExport } from "./creatorCompositionTextureExport";
import { buildTexturePack } from "./generators/texturePackBuilder";

function buildExport() {
  const composition = buildCreatorComposition({
    templateId: "survivor-pixel-32",
    subject: "animation",
    canvasWidth: 2,
    canvasHeight: 2,
    layers: [{ id: "base", label: "พื้นฐาน", role: "base", zIndex: 0, visible: true, opacity: 1 }],
    parts: [{ id: "body", label: "ส่วนหลัก", slot: "body", x: 0, y: 0, width: 2, height: 2, layerIds: ["base"] }],
    palette: [{ id: "green", label: "เขียว", hex: "#3f8f5b", semantic: "พื้นผิวหลัก" }],
    pixels: [{ x: 1, y: 0, colorId: "green", layerId: "base" }],
  });
  const textureInput = buildCompositionTextureInput(composition, { source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });
  const output = buildTexturePack(textureInput);
  return buildCreatorCompositionTextureExport({ output, compositionHash: composition.registryMetadata.contentSha256 });
}

describe("creator composition texture compatibility", () => {
  it("accepts canonical manifest, PNG and ZIP bytes while keeping runtime denied", () => {
    const exported = buildExport();
    const result = validateCreatorCompositionTextureExport(exported);

    expect(result).toMatchObject({
      schemaVersion: "a-survival.creator-composition-texture-compatibility.v1",
      decision: "compatible",
      previewOnly: true,
      checkedFiles: ["manifest.json", "skins/survivor-pixel-32.png"],
      runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    });
    expect(result.reasons).toEqual([]);
    expect(result.bundleSha256).toBe(exported.bundleFile.sha256);
  });

  it("blocks tampered manifest, ZIP hash and bundle file list", () => {
    const exported = buildExport();
    const manifestBytes = Buffer.from(exported.manifestFile.contentBase64, "base64");
    const tamperedManifest = Buffer.from(manifestBytes);
    tamperedManifest[tamperedManifest.length - 2] = tamperedManifest[tamperedManifest.length - 2] === 0x20 ? 0x21 : 0x20;
    const tampered = {
      ...exported,
      manifestFile: { ...exported.manifestFile, contentBase64: tamperedManifest.toString("base64") },
      bundleFile: { ...exported.bundleFile, sha256: createHash("sha256").update(Buffer.from(exported.bundleFile.contentBase64, "base64")).digest("hex").replace(/^./, "0") },
    };
    const result = validateCreatorCompositionTextureExport({ ...tampered, bundleFile: { ...tampered.bundleFile, files: ["manifest.json"] } });

    expect(result.decision).toBe("blocked");
    expect(result.reasons.map(item => item.code)).toEqual(expect.arrayContaining(["MANIFEST_HASH_MISMATCH", "ZIP_HASH_MISMATCH", "BUNDLE_FILE_LIST_MISMATCH"]));
  });

  it("blocks any attempt to enable runtime or player policy", () => {
    const exported = buildExport();
    const result = validateCreatorCompositionTextureExport({
      ...exported,
      runtimePolicy: { runtimeImportAllowed: true, playerVisible: false, cacheable: false },
    } as typeof exported);

    expect(result.decision).toBe("blocked");
    expect(result.reasons.map(item => item.code)).toContain("RUNTIME_POLICY_ENABLED");
  });
});
