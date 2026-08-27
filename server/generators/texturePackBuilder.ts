import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import {
  CommonGeneratorRegistry,
  hashStableJson,
  type GeneratorAssetRef,
  type GeneratorPlugin,
  type GeneratorValidationResult,
} from "./commonGeneratorApi";

export type TextureAssetKind = "icon" | "tile" | "skin" | "atlas";
export type TextureLayer = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rgba: number[];
};

export type SkinLayoutPart = {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SkinLayout = {
  id: string;
  parts: SkinLayoutPart[];
  allowPartOverlap: boolean;
};

export type TextureAssetInput = {
  assetId: string;
  kind: TextureAssetKind;
  width: number;
  height: number;
  layers: TextureLayer[];
  source: GeneratorAssetRef["source"];
  provenanceRef: string;
  skinLayout?: SkinLayout;
};

export type TexturePackInput = {
  id: string;
  namespace: string;
  version: string;
  displayName: string;
  textureSampling: "nearest" | "linear";
  assets: TextureAssetInput[];
};

export type BuiltTextureAsset = {
  assetId: string;
  kind: TextureAssetKind;
  width: number;
  height: number;
  relativePath: string;
  mime: "image/png";
  sha256: string;
  source: GeneratorAssetRef["source"];
  provenanceRef: string;
  pngBase64: string;
};

export type TexturePackManifest = {
  schemaVersion: "a-survival.texture-pack.v1";
  id: string;
  namespace: string;
  version: string;
  displayName: string;
  textureSampling: "nearest" | "linear";
  entries: Record<string, {
    kind: TextureAssetKind;
    path: string;
    mime: "image/png";
    sha256: string;
    source: GeneratorAssetRef["source"];
    provenanceRef: string;
  }>;
  packSha256: string;
};

export type TexturePackOutput = {
  schemaVersion: "a-survival.texture-pack-output.v1";
  manifest: TexturePackManifest;
  assets: BuiltTextureAsset[];
};

const MAX_TEXTURE_SIZE = 2048;
const MAX_LAYERS_PER_ASSET = 128;
const SUPPORTED_SOURCES: GeneratorAssetRef["source"][] = ["generated", "starter-authored", "provided", "reference-only"];

function isInteger(value: number) {
  return Number.isInteger(value);
}

function validIdentifier(value: string) {
  return /^[a-z0-9][a-z0-9._-]{1,63}$/.test(value);
}

function validHexRgba(values: number[]) {
  return values.length === 4 && values.every(value => isInteger(value) && value >= 0 && value <= 255);
}

function rectanglesOverlap(left: SkinLayoutPart, right: SkinLayoutPart) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function crc32(buffer: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < buffer.length; index += 1) {
    crc ^= buffer[index]!;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Uint8Array) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcInput = Buffer.concat([typeBytes, Buffer.from(data)]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcInput), 0);
  return Buffer.concat([length, typeBytes, Buffer.from(data), crc]);
}

function encodeRgbaPng(width: number, height: number, pixels: Uint8Array) {
  const scanlines = Buffer.alloc(height * (1 + width * 4));
  for (let y = 0; y < height; y += 1) {
    const rowOffset = y * (1 + width * 4);
    scanlines[rowOffset] = 0;
    const sourceOffset = y * width * 4;
    Buffer.from(pixels.subarray(sourceOffset, sourceOffset + width * 4)).copy(scanlines, rowOffset + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(scanlines, { level: 9 })),
    pngChunk("IEND", new Uint8Array()),
  ]);
}

function assetRelativePath(asset: TextureAssetInput) {
  if (asset.kind === "icon") return `icons/${asset.assetId}.png`;
  if (asset.kind === "skin") return `skins/${asset.assetId}.png`;
  if (asset.kind === "atlas") return `atlases/${asset.assetId}.png`;
  return `textures/${asset.assetId}.png`;
}

function putLayer(pixels: Uint8Array, asset: TextureAssetInput, layer: TextureLayer) {
  for (let y = 0; y < layer.height; y += 1) {
    for (let x = 0; x < layer.width; x += 1) {
      const sourceIndex = (y * layer.width + x) * 4;
      const targetIndex = ((layer.y + y) * asset.width + layer.x + x) * 4;
      pixels[targetIndex] = layer.rgba[sourceIndex] ?? 0;
      pixels[targetIndex + 1] = layer.rgba[sourceIndex + 1] ?? 0;
      pixels[targetIndex + 2] = layer.rgba[sourceIndex + 2] ?? 0;
      pixels[targetIndex + 3] = layer.rgba[sourceIndex + 3] ?? 0;
    }
  }
}

function stableEntryMap(entries: TexturePackManifest["entries"]) {
  return Object.fromEntries(Object.entries(entries).sort(([left], [right]) => left.localeCompare(right)));
}

function buildManifest(input: TexturePackInput, assets: BuiltTextureAsset[]) {
  const entries = stableEntryMap(Object.fromEntries(assets.map(asset => [asset.assetId, {
    kind: asset.kind,
    path: asset.relativePath,
    mime: "image/png" as const,
    sha256: asset.sha256,
    source: asset.source,
    provenanceRef: asset.provenanceRef,
  }])));
  const withoutHash = {
    schemaVersion: "a-survival.texture-pack.v1" as const,
    id: input.id,
    namespace: input.namespace,
    version: input.version,
    displayName: input.displayName,
    textureSampling: input.textureSampling,
    entries,
  };
  return { ...withoutHash, packSha256: hashStableJson(withoutHash as never) };
}

function validateSkinLayout(asset: TextureAssetInput, issues: string[]) {
  if (asset.kind !== "skin") {
    if (asset.skinLayout) issues.push(`non-skin asset cannot have skinLayout: ${asset.assetId}`);
    return;
  }
  if (!asset.skinLayout) {
    issues.push(`skin asset requires skinLayout: ${asset.assetId}`);
    return;
  }
  if (!validIdentifier(asset.skinLayout.id)) issues.push(`skin layout id is invalid: ${asset.assetId}`);
  const ids = new Set<string>();
  for (const part of asset.skinLayout.parts) {
    if (!validIdentifier(part.id) || ids.has(part.id)) issues.push(`skin layout part id is invalid or duplicated: ${asset.assetId}/${part.id}`);
    ids.add(part.id);
    if (!isInteger(part.x) || !isInteger(part.y) || !isInteger(part.width) || !isInteger(part.height) || part.width < 1 || part.height < 1) {
      issues.push(`skin layout part geometry is invalid: ${asset.assetId}/${part.id}`);
    }
    if (part.x < 0 || part.y < 0 || part.x + part.width > asset.width || part.y + part.height > asset.height) {
      issues.push(`skin layout part is outside canvas: ${asset.assetId}/${part.id}`);
    }
  }
  if (!asset.skinLayout.allowPartOverlap) {
    for (let leftIndex = 0; leftIndex < asset.skinLayout.parts.length; leftIndex += 1) {
      for (let rightIndex = leftIndex + 1; rightIndex < asset.skinLayout.parts.length; rightIndex += 1) {
        if (rectanglesOverlap(asset.skinLayout.parts[leftIndex]!, asset.skinLayout.parts[rightIndex]!)) {
          issues.push(`skin layout parts overlap: ${asset.assetId}`);
        }
      }
    }
  }
}

export function validateTexturePackInput(input: TexturePackInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (!validIdentifier(input.id)) issues.push("pack id is invalid");
  if (!validIdentifier(input.namespace)) issues.push("pack namespace is invalid");
  if (!/^\d+\.\d+\.\d+$/.test(input.version)) issues.push("pack version must use semver x.y.z");
  if (!input.displayName.trim()) issues.push("pack displayName is required");
  if (input.assets.length === 0) issues.push("at least one texture asset is required");
  const ids = new Set<string>();
  for (const asset of input.assets) {
    if (!validIdentifier(asset.assetId) || ids.has(asset.assetId)) issues.push(`asset id is invalid or duplicated: ${asset.assetId}`);
    ids.add(asset.assetId);
    if (!isInteger(asset.width) || !isInteger(asset.height) || asset.width < 1 || asset.height < 1 || asset.width > MAX_TEXTURE_SIZE || asset.height > MAX_TEXTURE_SIZE) {
      issues.push(`asset dimensions must be integer 1–${MAX_TEXTURE_SIZE}: ${asset.assetId}`);
    }
    if (asset.layers.length > MAX_LAYERS_PER_ASSET) issues.push(`asset has too many layers: ${asset.assetId}`);
    if (!SUPPORTED_SOURCES.includes(asset.source)) issues.push(`asset source is unsupported: ${asset.assetId}`);
    if (!asset.provenanceRef.trim()) issues.push(`asset provenanceRef is required: ${asset.assetId}`);
    const layerIds = new Set<string>();
    for (const layer of asset.layers) {
      if (!validIdentifier(layer.id) || layerIds.has(layer.id)) issues.push(`layer id is invalid or duplicated: ${asset.assetId}/${layer.id}`);
      layerIds.add(layer.id);
      if (!isInteger(layer.x) || !isInteger(layer.y) || !isInteger(layer.width) || !isInteger(layer.height) || layer.width < 1 || layer.height < 1) issues.push(`layer geometry is invalid: ${asset.assetId}/${layer.id}`);
      if (layer.x < 0 || layer.y < 0 || layer.x + layer.width > asset.width || layer.y + layer.height > asset.height) issues.push(`layer is outside canvas: ${asset.assetId}/${layer.id}`);
      if (layer.rgba.length !== layer.width * layer.height * 4) issues.push(`layer rgba length does not match geometry: ${asset.assetId}/${layer.id}`);
      if (!layer.rgba.every(value => isInteger(value) && value >= 0 && value <= 255)) issues.push(`layer rgba contains invalid channel: ${asset.assetId}/${layer.id}`);
    }
    validateSkinLayout(asset, issues);
  }
  return { valid: issues.length === 0, issues };
}

export function buildTexturePack(input: TexturePackInput): TexturePackOutput {
  const validation = validateTexturePackInput(input);
  if (!validation.valid) throw new Error(`Texture pack input is invalid: ${validation.issues.join("; ")}`);
  const assets = input.assets.map(asset => {
    const pixels = new Uint8Array(asset.width * asset.height * 4);
    for (const layer of asset.layers) putLayer(pixels, asset, layer);
    const png = encodeRgbaPng(asset.width, asset.height, pixels);
    return {
      assetId: asset.assetId,
      kind: asset.kind,
      width: asset.width,
      height: asset.height,
      relativePath: assetRelativePath(asset),
      mime: "image/png" as const,
      sha256: createHash("sha256").update(png).digest("hex"),
      source: asset.source,
      provenanceRef: asset.provenanceRef,
      pngBase64: png.toString("base64"),
    };
  }).sort((left, right) => left.assetId.localeCompare(right.assetId));
  return { schemaVersion: "a-survival.texture-pack-output.v1", manifest: buildManifest(input, assets), assets };
}

export function validateTexturePackOutput(output: TexturePackOutput, input?: TexturePackInput): GeneratorValidationResult {
  const issues: string[] = [];
  if (output.schemaVersion !== "a-survival.texture-pack-output.v1") issues.push("unsupported texture pack output schema");
  if (input && (output.manifest.id !== input.id || output.manifest.namespace !== input.namespace || output.manifest.version !== input.version)) issues.push("manifest identity does not match input");
  const ids = new Set<string>();
  for (const asset of output.assets) {
    if (ids.has(asset.assetId)) issues.push(`duplicate built asset: ${asset.assetId}`);
    ids.add(asset.assetId);
    const bytes = Buffer.from(asset.pngBase64, "base64");
    if (asset.mime !== "image/png" || bytes.length < 32) issues.push(`built asset is not a valid PNG payload: ${asset.assetId}`);
    if (asset.sha256 !== createHash("sha256").update(bytes).digest("hex")) issues.push(`built asset digest mismatch: ${asset.assetId}`);
    const manifestEntry = output.manifest.entries[asset.assetId];
    if (!manifestEntry || manifestEntry.kind !== asset.kind || manifestEntry.sha256 !== asset.sha256 || manifestEntry.path !== asset.relativePath) issues.push(`manifest entry mismatch: ${asset.assetId}`);
  }
  if (new Set(Object.keys(output.manifest.entries)).size !== output.assets.length) issues.push("manifest and built asset counts differ");
  const { packSha256: _packSha256, ...manifestWithoutHash } = output.manifest;
  if (output.manifest.packSha256 !== hashStableJson(manifestWithoutHash as never)) issues.push("texture pack manifest hash mismatch");
  return { valid: issues.length === 0, issues };
}

export const texturePackBuilderPlugin: GeneratorPlugin<TexturePackInput, TexturePackOutput> = {
  id: "texture.pack",
  version: "1.0.0",
  kind: "texture",
  generate: input => buildTexturePack(input),
  validate: (output, input) => validateTexturePackOutput(output, input),
  preview: output => ({
    recordCount: output.assets.length,
    ids: output.assets.map(asset => asset.assetId),
    assetRefs: output.assets.map(asset => ({
      assetId: asset.assetId,
      kind: "texture" as const,
      source: asset.source,
      relativePath: asset.relativePath,
      sha256: asset.sha256,
      provenanceRef: asset.provenanceRef,
    })),
  }),
};

export function createTexturePackBuilderRegistry() {
  return new CommonGeneratorRegistry().register(texturePackBuilderPlugin);
}

export function solidRgba(width: number, height: number, rgba: [number, number, number, number]) {
  return Array.from({ length: width * height }, () => [...rgba]).flat();
}
