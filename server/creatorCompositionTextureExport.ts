import { hashStableJson } from "./generators/commonGeneratorApi";
import {
  validateTexturePackOutput,
  type BuiltTextureAsset,
  type TexturePackOutput,
} from "./generators/texturePackBuilder";

export type CreatorCompositionTextureExport = {
  exportSchemaVersion: "a-survival.creator-composition-texture-export.v1";
  exportId: string;
  previewOnly: true;
  compositionHash: string;
  packSha256: string;
  manifest: TexturePackOutput["manifest"];
  assets: Array<Pick<BuiltTextureAsset, "assetId" | "kind" | "width" | "height" | "relativePath" | "mime" | "sha256" | "source" | "provenanceRef" | "pngBase64"> & { downloadFileName: string }>;
  downloadable: true;
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
  registerRequiresSeparateAction: true;
  reviewRequired: true;
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;

function downloadFileName(asset: BuiltTextureAsset) {
  const fileName = asset.relativePath.split("/").pop() ?? `${asset.assetId}.png`;
  return fileName.endsWith(".png") ? fileName : `${fileName}.png`;
}

export function buildCreatorCompositionTextureExport(input: { output: TexturePackOutput; compositionHash: string }): CreatorCompositionTextureExport {
  if (!SHA256_PATTERN.test(input.compositionHash)) throw new Error("Composition texture export requires a lowercase SHA-256 composition hash");
  const validation = validateTexturePackOutput(input.output);
  if (!validation.valid) throw new Error(`Composition texture export input is invalid: ${validation.issues.join("; ")}`);
  const assets = input.output.assets.map(asset => ({
    assetId: asset.assetId,
    kind: asset.kind,
    width: asset.width,
    height: asset.height,
    relativePath: asset.relativePath,
    mime: asset.mime,
    sha256: asset.sha256,
    source: asset.source,
    provenanceRef: asset.provenanceRef,
    pngBase64: asset.pngBase64,
    downloadFileName: downloadFileName(asset),
  }));
  const exportIdentity = {
    exportSchemaVersion: "a-survival.creator-composition-texture-export.v1" as const,
    compositionHash: input.compositionHash,
    packSha256: input.output.manifest.packSha256,
    assets: assets.map(asset => ({ assetId: asset.assetId, sha256: asset.sha256 })),
  };
  return {
    ...exportIdentity,
    exportId: hashStableJson(exportIdentity as never),
    previewOnly: true,
    manifest: input.output.manifest,
    assets,
    downloadable: true,
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
    registerRequiresSeparateAction: true,
    reviewRequired: true,
  };
}
