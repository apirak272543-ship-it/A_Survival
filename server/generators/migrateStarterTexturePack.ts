import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { inflateSync } from "node:zlib";
import {
  buildTexturePack,
  type TextureAssetInput,
  type TexturePackInput,
} from "./texturePackBuilder";

type StarterManifest = {
  id: string;
  namespace: string;
  displayName: string;
  version: string;
  textureSampling: "nearest" | "linear";
  entries: Record<string, {
    kind: string;
    path: string;
    mime: "image/png";
    sha256: string;
    source: string;
    provenanceRef: string;
  }>;
};

type DecodedPng = { width: number; height: number; rgba: Uint8Array };

const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const DEFAULT_SOURCE_ROOT = resolve(process.cwd(), "client/public/assets/packs/a-survival-content-library-v0-1");
const DEFAULT_TARGET_ROOT = resolve(process.cwd(), "client/public/assets/packs/a-survival-content-library-builder-v0-1");

function paeth(a: number, b: number, c: number) {
  const estimate = a + b - c;
  const distanceA = Math.abs(estimate - a);
  const distanceB = Math.abs(estimate - b);
  const distanceC = Math.abs(estimate - c);
  if (distanceA <= distanceB && distanceA <= distanceC) return a;
  if (distanceB <= distanceC) return b;
  return c;
}

function readBigEndian(buffer: Buffer, offset: number) {
  return buffer.readUInt32BE(offset);
}

export function decodeRgbaPng(buffer: Buffer): DecodedPng {
  if (!buffer.subarray(0, 8).equals(PNG_SIGNATURE)) throw new Error("starter asset is not a PNG");
  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];
  while (offset < buffer.length) {
    const length = readBigEndian(buffer, offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    if (dataEnd + 4 > buffer.length) throw new Error("starter asset PNG chunk is truncated");
    const data = buffer.subarray(dataStart, dataEnd);
    if (type === "IHDR") {
      width = readBigEndian(data, 0);
      height = readBigEndian(data, 4);
      bitDepth = data[8] ?? 0;
      colorType = data[9] ?? 0;
      interlace = data[12] ?? 0;
    } else if (type === "IDAT") {
      idat.push(data);
    } else if (type === "IEND") {
      break;
    }
    offset = dataEnd + 4;
  }
  if (!width || !height || bitDepth !== 8 || ![2, 6].includes(colorType) || interlace !== 0) {
    throw new Error("starter asset PNG must be non-interlaced 8-bit RGB/RGBA");
  }
  const channels = colorType === 6 ? 4 : 3;
  const rowBytes = width * channels;
  const decoded = inflateSync(Buffer.concat(idat));
  const expectedLength = height * (rowBytes + 1);
  if (decoded.length !== expectedLength) throw new Error(`starter asset scanline length mismatch: expected ${expectedLength}, got ${decoded.length}`);
  const rows: Buffer[] = [];
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = decoded[sourceOffset++];
    if (filter === undefined || filter > 4) throw new Error(`unsupported PNG filter: ${filter}`);
    const row = Buffer.alloc(rowBytes);
    const previous = rows[y - 1];
    for (let x = 0; x < rowBytes; x += 1) {
      const raw = decoded[sourceOffset++] ?? 0;
      const left = x >= channels ? row[x - channels]! : 0;
      const up = previous?.[x] ?? 0;
      const upperLeft = x >= channels ? previous?.[x - channels] ?? 0 : 0;
      const predictor = filter === 0 ? 0 : filter === 1 ? left : filter === 2 ? up : filter === 3 ? Math.floor((left + up) / 2) : paeth(left, up, upperLeft);
      row[x] = (raw + predictor) & 255;
    }
    rows.push(row);
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const row = rows[y]!;
    for (let x = 0; x < width; x += 1) {
      const sourceIndex = x * channels;
      const targetIndex = (y * width + x) * 4;
      rgba[targetIndex] = row[sourceIndex] ?? 0;
      rgba[targetIndex + 1] = row[sourceIndex + 1] ?? 0;
      rgba[targetIndex + 2] = row[sourceIndex + 2] ?? 0;
      rgba[targetIndex + 3] = channels === 4 ? row[sourceIndex + 3] ?? 0 : 255;
    }
  }
  return { width, height, rgba };
}

export async function readStarterManifest(sourceRoot = DEFAULT_SOURCE_ROOT): Promise<StarterManifest> {
  return JSON.parse(await readFile(join(sourceRoot, "manifest.json"), "utf8")) as StarterManifest;
}

function mapStarterSource(source: string): TextureAssetInput["source"] {
  if (source === "procedural-starter-authored") return "starter-authored";
  if (source === "generated" || source === "starter-authored" || source === "provided" || source === "reference-only") return source;
  throw new Error(`unsupported starter provenance source: ${source}`);
}

export async function createStarterTexturePackInput(sourceRoot = DEFAULT_SOURCE_ROOT): Promise<TexturePackInput> {
  const manifest = await readStarterManifest(sourceRoot);
  const assets: TextureAssetInput[] = [];
  for (const [assetId, entry] of Object.entries(manifest.entries).sort(([left], [right]) => left.localeCompare(right))) {
    const bytes = await readFile(join(sourceRoot, entry.path));
    const decoded = decodeRgbaPng(bytes);
    assets.push({
      assetId,
      kind: entry.kind === "terrain" ? "tile" : "icon",
      width: decoded.width,
      height: decoded.height,
      layers: [{ id: "base", x: 0, y: 0, width: decoded.width, height: decoded.height, rgba: Array.from(decoded.rgba) }],
      source: mapStarterSource(entry.source),
      provenanceRef: entry.provenanceRef,
    });
  }
  return {
    id: "a-survival-content-library-builder-v0-1",
    namespace: "afc-builder",
    version: "0.1.0",
    displayName: `${manifest.displayName} · Builder Output`,
    textureSampling: manifest.textureSampling,
    assets,
  };
}

export async function migrateStarterTexturePack(options: {
  sourceRoot?: string;
  targetRoot?: string;
} = {}) {
  const sourceRoot = options.sourceRoot ?? DEFAULT_SOURCE_ROOT;
  const targetRoot = options.targetRoot ?? DEFAULT_TARGET_ROOT;
  const input = await createStarterTexturePackInput(sourceRoot);
  const output = buildTexturePack(input);
  const entries = Object.fromEntries(output.assets.map(asset => [asset.assetId, {
    kind: "texture" as const,
    path: asset.relativePath,
    mime: asset.mime,
    sha256: asset.sha256,
    source: asset.source,
    provenanceRef: asset.provenanceRef,
  }]));
  await mkdir(targetRoot, { recursive: true });
  for (const asset of output.assets) {
    const filePath = join(targetRoot, asset.relativePath);
    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, Buffer.from(asset.pngBase64, "base64"));
  }
  await writeFile(join(targetRoot, "manifest.json"), `${JSON.stringify(output.manifest, null, 2)}\n`, "utf8");
  const sourceManifest = await readStarterManifest(sourceRoot);
  const provenance = {
    schemaVersion: "a-survival.texture-pack-migration.v1",
    sourcePack: sourceManifest.id,
    sourceManifestSha256: createHash("sha256").update(JSON.stringify(sourceManifest)).digest("hex"),
    builderGeneratorId: "texture.pack",
    builderGeneratorVersion: "1.0.0",
    sourceArtStatus: "procedural-starter-authored",
    usage: "future-library-only; not imported by playable Obsidian runtime",
    inputAssetCount: input.assets.length,
    outputPackSha256: output.manifest.packSha256,
  };
  await writeFile(join(targetRoot, "provenance.json"), `${JSON.stringify(provenance, null, 2)}\n`, "utf8");
  return { input, output, targetRoot, provenance };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  migrateStarterTexturePack()
    .then(result => {
      console.log(JSON.stringify({
        targetRoot: result.targetRoot,
        entries: result.output.assets.length,
        packSha256: result.output.manifest.packSha256,
        generator: "texture.pack@1.0.0",
      }));
    })
    .catch(error => {
      console.error(error);
      process.exitCode = 1;
    });
}
