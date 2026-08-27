import { createHash } from "node:crypto";
import { deflateRawSync } from "node:zlib";

export type DeterministicZipFile = {
  path: string;
  bytes: Uint8Array;
};

export type DeterministicZipOutput = {
  bytes: Buffer;
  sha256: string;
  files: string[];
};

const MAX_ARCHIVE_FILES = 512;
const MAX_ARCHIVE_BYTES = 64 * 1024 * 1024;

function crc32(bytes: Uint8Array) {
  let crc = 0xffffffff;
  for (let index = 0; index < bytes.length; index += 1) {
    crc ^= bytes[index] ?? 0;
    for (let bit = 0; bit < 8; bit += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function validArchivePath(path: string) {
  return path.length > 0 && path.length <= 255 && !path.startsWith("/") && !path.includes("\\") && !path.split("/").includes("..") && !path.split("/").includes("");
}

function writeLocalHeader(name: Buffer, method: number, checksum: number, compressedSize: number, size: number) {
  const header = Buffer.alloc(30 + name.length);
  header.writeUInt32LE(0x04034b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(0x0800, 6);
  header.writeUInt16LE(method, 8);
  header.writeUInt16LE(0, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt32LE(checksum, 14);
  header.writeUInt32LE(compressedSize, 18);
  header.writeUInt32LE(size, 22);
  header.writeUInt16LE(name.length, 26);
  header.writeUInt16LE(0, 28);
  name.copy(header, 30);
  return header;
}

function writeCentralHeader(name: Buffer, method: number, checksum: number, compressedSize: number, size: number, localOffset: number) {
  const header = Buffer.alloc(46 + name.length);
  header.writeUInt32LE(0x02014b50, 0);
  header.writeUInt16LE(20, 4);
  header.writeUInt16LE(20, 6);
  header.writeUInt16LE(0x0800, 8);
  header.writeUInt16LE(method, 10);
  header.writeUInt16LE(0, 12);
  header.writeUInt16LE(0, 14);
  header.writeUInt32LE(checksum, 16);
  header.writeUInt32LE(compressedSize, 20);
  header.writeUInt32LE(size, 24);
  header.writeUInt16LE(name.length, 28);
  header.writeUInt16LE(0, 30);
  header.writeUInt16LE(0, 32);
  header.writeUInt16LE(0, 34);
  header.writeUInt16LE(0, 36);
  header.writeUInt32LE(0, 38);
  header.writeUInt32LE(localOffset, 42);
  name.copy(header, 46);
  return header;
}

export function buildDeterministicZip(files: DeterministicZipFile[]): DeterministicZipOutput {
  if (files.length === 0) throw new Error("ZIP archive requires at least one file");
  if (files.length > MAX_ARCHIVE_FILES) throw new Error(`ZIP archive has too many files: ${files.length}`);
  const sorted = [...files].sort((left, right) => left.path.localeCompare(right.path));
  const seen = new Set<string>();
  let totalBytes = 0;
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;

  for (const file of sorted) {
    if (!validArchivePath(file.path)) throw new Error(`Unsafe ZIP archive path: ${file.path}`);
    if (seen.has(file.path)) throw new Error(`Duplicate ZIP archive path: ${file.path}`);
    seen.add(file.path);
    const bytes = Buffer.from(file.bytes);
    totalBytes += bytes.length;
    if (totalBytes > MAX_ARCHIVE_BYTES) throw new Error(`ZIP archive exceeds ${MAX_ARCHIVE_BYTES} uncompressed bytes`);
    const compressed = deflateRawSync(bytes, { level: 9 });
    const method = compressed.length < bytes.length ? 8 : 0;
    const payload = method === 8 ? compressed : bytes;
    const name = Buffer.from(file.path, "utf8");
    const checksum = crc32(bytes);
    const localHeader = writeLocalHeader(name, method, checksum, payload.length, bytes.length);
    localParts.push(localHeader, payload);
    centralParts.push(writeCentralHeader(name, method, checksum, payload.length, bytes.length, offset));
    offset += localHeader.length + payload.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const localData = Buffer.concat(localParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(sorted.length, 8);
  end.writeUInt16LE(sorted.length, 10);
  end.writeUInt32LE(centralDirectory.length, 12);
  end.writeUInt32LE(localData.length, 16);
  end.writeUInt16LE(0, 20);
  const archive = Buffer.concat([localData, centralDirectory, end]);
  return { bytes: archive, sha256: createHash("sha256").update(archive).digest("hex"), files: sorted.map(file => file.path) };
}
