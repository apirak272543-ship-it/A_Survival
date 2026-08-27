import { createHash } from "node:crypto";
import { inflateRawSync } from "node:zlib";
import type { CreatorCompositionTextureExport } from "./creatorCompositionTextureExport";

export type CreatorCompositionTextureCompatibilityReason = {
  code: string;
  title: string;
  detail: string;
};

export type CreatorCompositionTextureCompatibility = {
  schemaVersion: "a-survival.creator-composition-texture-compatibility.v1";
  decision: "compatible" | "blocked";
  previewOnly: true;
  compositionHash: string;
  packSha256: string;
  manifestSha256: string;
  bundleSha256: string;
  checkedFiles: string[];
  reasons: CreatorCompositionTextureCompatibilityReason[];
  runtimePolicy: {
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
  };
};

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const PNG_SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ZIP_LOCAL_SIGNATURE = 0x04034b50;
const ZIP_CENTRAL_SIGNATURE = 0x02014b50;
const ZIP_END_SIGNATURE = 0x06054b50;

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${stableJson(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value) ?? "null";
}

function sha256(bytes: Uint8Array) {
  return createHash("sha256").update(bytes).digest("hex");
}

function sameBytes(left: Uint8Array, right: Uint8Array) {
  return Buffer.compare(Buffer.from(left), Buffer.from(right)) === 0;
}

function parseBase64(value: string) {
  try {
    const bytes = Buffer.from(value, "base64");
    if (!value || bytes.length === 0) return null;
    return bytes;
  } catch {
    return null;
  }
}

function readZipEntries(bytes: Buffer) {
  const issues: string[] = [];
  const endOffset = bytes.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  if (endOffset < 0 || endOffset + 22 > bytes.length) return { entries: new Map<string, Buffer>(), issues: ["ZIP end-of-central-directory record is missing"] };
  const entryCount = bytes.readUInt16LE(endOffset + 10);
  const centralSize = bytes.readUInt32LE(endOffset + 12);
  const centralOffset = bytes.readUInt32LE(endOffset + 16);
  if (centralOffset + centralSize > bytes.length || endOffset < centralOffset + centralSize) return { entries: new Map<string, Buffer>(), issues: ["ZIP central directory bounds are invalid"] };
  const entries = new Map<string, Buffer>();
  let cursor = centralOffset;
  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > bytes.length || bytes.readUInt32LE(cursor) !== ZIP_CENTRAL_SIGNATURE) {
      issues.push(`ZIP central entry ${index} is invalid`);
      break;
    }
    const method = bytes.readUInt16LE(cursor + 10);
    const compressedSize = bytes.readUInt32LE(cursor + 20);
    const uncompressedSize = bytes.readUInt32LE(cursor + 24);
    const nameLength = bytes.readUInt16LE(cursor + 28);
    const extraLength = bytes.readUInt16LE(cursor + 30);
    const commentLength = bytes.readUInt16LE(cursor + 32);
    const localOffset = bytes.readUInt32LE(cursor + 42);
    const nameStart = cursor + 46;
    const nextCursor = nameStart + nameLength + extraLength + commentLength;
    if (nextCursor > bytes.length) {
      issues.push(`ZIP central entry ${index} exceeds archive bounds`);
      break;
    }
    const path = bytes.subarray(nameStart, nameStart + nameLength).toString("utf8");
    if (entries.has(path)) issues.push(`ZIP contains duplicate path: ${path}`);
    if (localOffset + 30 > bytes.length || bytes.readUInt32LE(localOffset) !== ZIP_LOCAL_SIGNATURE) {
      issues.push(`ZIP local entry is invalid: ${path}`);
      cursor = nextCursor;
      continue;
    }
    const localNameLength = bytes.readUInt16LE(localOffset + 26);
    const localExtraLength = bytes.readUInt16LE(localOffset + 28);
    const payloadStart = localOffset + 30 + localNameLength + localExtraLength;
    const payloadEnd = payloadStart + compressedSize;
    if (payloadEnd > bytes.length) {
      issues.push(`ZIP payload exceeds archive bounds: ${path}`);
      cursor = nextCursor;
      continue;
    }
    const compressed = bytes.subarray(payloadStart, payloadEnd);
    let content: Buffer;
    try {
      if (method === 0) content = Buffer.from(compressed);
      else if (method === 8) content = inflateRawSync(compressed);
      else {
        issues.push(`ZIP compression method is unsupported: ${path}`);
        cursor = nextCursor;
        continue;
      }
    } catch {
      issues.push(`ZIP payload cannot be decompressed: ${path}`);
      cursor = nextCursor;
      continue;
    }
    if (content.length !== uncompressedSize) issues.push(`ZIP uncompressed size mismatch: ${path}`);
    const expectedCrc = bytes.readUInt32LE(cursor + 16);
    let crc = 0xffffffff;
    for (let byteIndex = 0; byteIndex < content.length; byteIndex += 1) {
      crc ^= content[byteIndex] ?? 0;
      for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
    if (((crc ^ 0xffffffff) >>> 0) !== expectedCrc) issues.push(`ZIP CRC mismatch: ${path}`);
    entries.set(path, content);
    cursor = nextCursor;
  }
  if (entryCount !== entries.size) issues.push("ZIP entry count does not match readable entries");
  return { entries, issues };
}

function reason(code: string, title: string, detail: string): CreatorCompositionTextureCompatibilityReason {
  return { code, title, detail };
}

export function validateCreatorCompositionTextureExport(exported: CreatorCompositionTextureExport): CreatorCompositionTextureCompatibility {
  const reasons: CreatorCompositionTextureCompatibilityReason[] = [];
  const checkedFiles: string[] = [];
  if (exported.exportSchemaVersion !== "a-survival.creator-composition-texture-export.v1") reasons.push(reason("SCHEMA_UNSUPPORTED", "schema ไม่รองรับ", "export schema ไม่ใช่เวอร์ชันที่ validator นี้ตรวจได้"));
  if (!exported.previewOnly || !exported.downloadable) reasons.push(reason("EXPORT_FLAGS_INVALID", "สถานะ export ไม่ปลอดภัย", "export ต้องเป็น previewOnly และ downloadable"));
  if (exported.runtimePolicy.runtimeImportAllowed || exported.runtimePolicy.playerVisible || exported.runtimePolicy.cacheable) reasons.push(reason("RUNTIME_POLICY_ENABLED", "runtime policy เปิดอยู่", "bundle creator ห้าม import เข้า runtime, แสดงใน player หรือ cache"));
  if (!exported.registerRequiresSeparateAction || !exported.reviewRequired) reasons.push(reason("GATE_FLAGS_MISSING", "gate ไม่ครบ", "registration และ review ต้องเป็น action แยกจาก export"));
  if (!SHA256_PATTERN.test(exported.compositionHash) || !SHA256_PATTERN.test(exported.packSha256) || !SHA256_PATTERN.test(exported.manifestSha256) || !SHA256_PATTERN.test(exported.bundleFile.sha256)) reasons.push(reason("HASH_FORMAT_INVALID", "รูปแบบ hash ไม่ถูกต้อง", "composition/pack/manifest/bundle ต้องเป็น lowercase SHA-256"));

  const manifestBytes = parseBase64(exported.manifestFile.contentBase64);
  if (!manifestBytes || exported.manifestFile.fileName !== "manifest.json" || exported.manifestFile.mime !== "application/json") {
    reasons.push(reason("MANIFEST_FILE_INVALID", "ไฟล์ manifest ไม่ถูกต้อง", "manifest file ต้องเป็น manifest.json แบบ application/json และมี bytes"));
  } else {
    checkedFiles.push(exported.manifestFile.fileName);
    if (sha256(manifestBytes) !== exported.manifestFile.sha256 || exported.manifestFile.sha256 !== exported.manifestSha256) reasons.push(reason("MANIFEST_HASH_MISMATCH", "manifest hash ไม่ตรง", "SHA-256 ของ manifest bytes ไม่ตรงกับ manifestSha256"));
    try {
      const parsedManifest = JSON.parse(manifestBytes.toString("utf8"));
      if (stableJson(parsedManifest) !== stableJson(exported.manifest)) reasons.push(reason("MANIFEST_CONTENT_MISMATCH", "manifest เนื้อหาไม่ตรง", "manifest.json ที่ส่งออกไม่ตรงกับ manifest ใน export contract"));
      if (parsedManifest.packSha256 !== exported.packSha256) reasons.push(reason("PACK_HASH_MISMATCH", "pack hash ไม่ตรง", "manifest packSha256 ไม่ตรงกับ export packSha256"));
    } catch {
      reasons.push(reason("MANIFEST_JSON_INVALID", "manifest JSON อ่านไม่ได้", "manifest bytes ต้องเป็น JSON ที่ parse ได้"));
    }
  }

  const expectedAssetPaths = exported.assets.map(asset => asset.relativePath).sort((left, right) => left.localeCompare(right));
  for (const asset of exported.assets) {
    const bytes = parseBase64(asset.pngBase64);
    checkedFiles.push(asset.relativePath);
    if (!bytes || !sameBytes(bytes.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE) || asset.mime !== "image/png") {
      reasons.push(reason("PNG_BYTES_INVALID", "PNG bytes ไม่ถูกต้อง", `asset ${asset.assetId} ต้องเป็น PNG ที่มี signature ถูกต้อง`));
      continue;
    }
    if (sha256(bytes) !== asset.sha256) reasons.push(reason("PNG_HASH_MISMATCH", "PNG hash ไม่ตรง", `asset ${asset.assetId} มี SHA-256 ไม่ตรงกับ bytes`));
    const entry = exported.manifest.entries[asset.assetId];
    if (!entry || entry.path !== asset.relativePath || entry.sha256 !== asset.sha256 || entry.mime !== asset.mime) reasons.push(reason("MANIFEST_ASSET_MISMATCH", "manifest กับ asset ไม่ตรง", `manifest entry ของ ${asset.assetId} ไม่ตรงกับ asset bytes`));
  }

  const bundleBytes = parseBase64(exported.bundleFile.contentBase64);
  if (!bundleBytes || exported.bundleFile.mime !== "application/zip" || !exported.bundleFile.fileName.endsWith(".zip")) {
    reasons.push(reason("ZIP_FILE_INVALID", "ZIP file ไม่ถูกต้อง", "bundle ต้องเป็น application/zip และมีชื่อไฟล์ลงท้าย .zip"));
  } else {
    if (sha256(bundleBytes) !== exported.bundleFile.sha256 || exported.bundleFile.sha256 !== exported.bundleSha256) reasons.push(reason("ZIP_HASH_MISMATCH", "ZIP hash ไม่ตรง", "SHA-256 ของ ZIP bytes ไม่ตรงกับ bundleSha256"));
    const zip = readZipEntries(bundleBytes);
    reasons.push(...zip.issues.map(detail => reason("ZIP_STRUCTURE_INVALID", "โครงสร้าง ZIP ไม่ถูกต้อง", detail)));
    const expectedPaths = ["manifest.json", ...expectedAssetPaths].sort((left, right) => left.localeCompare(right));
    if (stableJson(zip.entries.size ? Array.from(zip.entries.keys()).sort((left, right) => left.localeCompare(right)) : []) !== stableJson(expectedPaths)) reasons.push(reason("ZIP_FILE_LIST_MISMATCH", "รายการไฟล์ใน ZIP ไม่ตรง", "ZIP ต้องมี manifest.json และทุก relative PNG path ตาม manifest เท่านั้น"));
    if (stableJson(exported.bundleFile.files) !== stableJson(expectedPaths)) reasons.push(reason("BUNDLE_FILE_LIST_MISMATCH", "metadata รายการไฟล์ไม่ตรง", "bundleFile.files ต้องเรียงและตรงกับไฟล์ใน ZIP"));
    if (manifestBytes && zip.entries.has("manifest.json") && !sameBytes(zip.entries.get("manifest.json")!, manifestBytes)) reasons.push(reason("ZIP_MANIFEST_BYTES_MISMATCH", "manifest ใน ZIP ไม่ตรง", "manifest.json ใน ZIP ต้องตรงกับ manifest sidecar"));
    for (const asset of exported.assets) {
      const bytes = parseBase64(asset.pngBase64);
      const zipped = zip.entries.get(asset.relativePath);
      if (bytes && zipped && !sameBytes(zipped, bytes)) reasons.push(reason("ZIP_PNG_BYTES_MISMATCH", "PNG ใน ZIP ไม่ตรง", `PNG ใน ZIP ของ ${asset.assetId} ไม่ตรงกับ asset export`));
    }
  }

  return {
    schemaVersion: "a-survival.creator-composition-texture-compatibility.v1",
    decision: reasons.length === 0 ? "compatible" : "blocked",
    previewOnly: true,
    compositionHash: exported.compositionHash,
    packSha256: exported.packSha256,
    manifestSha256: exported.manifestSha256,
    bundleSha256: exported.bundleSha256,
    checkedFiles: Array.from(new Set(checkedFiles)).sort((left, right) => left.localeCompare(right)),
    reasons,
    runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false },
  };
}
