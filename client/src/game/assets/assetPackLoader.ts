export type AssetPackEntry = {
  kind: "texture" | "model" | "animation" | "audio" | "data";
  path: string;
  mime?: string;
  sha256?: string;
  fallback?: string;
};

export type AssetPackManifest = {
  schemaVersion: number;
  id: string;
  namespace: string;
  displayName: string;
  version: string;
  packSha256?: string;
  designSource: string;
  artStatus?: string;
  logicalResolution: { width: number; height: number };
  tileSize: number;
  textureSampling: "nearest" | "linear";
  dependencies: string[];
  basePath?: string;
  entries: Record<string, AssetPackEntry>;
};

export type AssetPackProgress = {
  assetId: string;
  loaded: number;
  total: number;
  progress: number;
  cached: boolean;
};

export type AssetPackResult = {
  manifest: AssetPackManifest | null;
  ready: boolean;
  cached: boolean;
  offline: boolean;
  failedAssetIds: string[];
};

export const DEFAULT_ASSET_PACK_MANIFEST = "/assets/packs/arcane-frontier-voxel-pixel/manifest.json";
export const ASSET_PACK_CACHE = "arcane-frontier-assets-v2";

const ASSET_ENTRY_KINDS = new Set<AssetPackEntry["kind"]>(["texture", "model", "animation", "audio", "data"]);
const ASSET_PACK_SCHEMA_VERSION = 1;
const SHA256_PATTERN = /^[a-f0-9]{64}$/i;

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isSafeRelativeAssetPath(path: string) {
  return path.length > 0 && !path.startsWith("/") && !path.includes("\\") && !path.split("/").some(segment => segment === ".." || segment === "");
}

function isSafeAbsoluteBasePath(path: string) {
  return path.length > 1 && path.startsWith("/") && !path.includes("\\") && !path.split("/").slice(1).some(segment => segment === "" || segment === "..");
}

export function isAssetPackManifest(value: unknown): value is AssetPackManifest {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<AssetPackManifest>;
  if (candidate.schemaVersion !== ASSET_PACK_SCHEMA_VERSION) return false;
  if (!isNonEmptyString(candidate.id) || !isNonEmptyString(candidate.version) || !isNonEmptyString(candidate.namespace)) return false;
  if (!isNonEmptyString(candidate.displayName) || !isNonEmptyString(candidate.designSource)) return false;
  if (typeof candidate.entries !== "object" || candidate.entries === null || Array.isArray(candidate.entries)) return false;
  if (!Number.isInteger(candidate.logicalResolution?.width) || (candidate.logicalResolution?.width ?? 0) <= 0) return false;
  if (!Number.isInteger(candidate.logicalResolution?.height) || (candidate.logicalResolution?.height ?? 0) <= 0) return false;
  const tileSize = candidate.tileSize;
  if (typeof tileSize !== "number" || !Number.isInteger(tileSize) || tileSize <= 0) return false;
  if (!["nearest", "linear"].includes(candidate.textureSampling ?? "")) return false;
  if (!Array.isArray(candidate.dependencies) || !candidate.dependencies.every(isNonEmptyString)) return false;
  if (candidate.basePath !== undefined && (typeof candidate.basePath !== "string" || !isSafeAbsoluteBasePath(candidate.basePath))) return false;
  if (typeof candidate.packSha256 !== "string" || !SHA256_PATTERN.test(candidate.packSha256)) return false;
  const entryIds = new Set(Object.keys(candidate.entries));
  if (entryIds.size === 0) return false;
  return Object.entries(candidate.entries).every(([assetId, entry]) => {
    if (!isNonEmptyString(assetId) || !entry || typeof entry !== "object") return false;
    const item = entry as Partial<AssetPackEntry>;
    return isNonEmptyString(item.path)
      && isSafeRelativeAssetPath(item.path)
      && typeof item.kind === "string"
      && ASSET_ENTRY_KINDS.has(item.kind as AssetPackEntry["kind"])
      && typeof item.sha256 === "string"
      && SHA256_PATTERN.test(item.sha256)
      && (item.fallback === undefined || (isNonEmptyString(item.fallback) && entryIds.has(item.fallback)));
  });
}

function withManifestBasePath(manifest: AssetPackManifest, manifestUrl: string) {
  if (manifest.basePath) return manifest;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  return { ...manifest, basePath: new URL("./", new URL(manifestUrl, origin)).pathname };
}

function resolveEntryPath(manifestUrl: string, entryPath: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const absoluteManifestUrl = new URL(manifestUrl, origin).toString();
  return new URL(entryPath, new URL("./", absoluteManifestUrl)).toString();
}

async function readCachedManifest(manifestUrl: string) {
  if (typeof caches === "undefined") return null;
  const cache = await caches.open(ASSET_PACK_CACHE);
  const response = await cache.match(manifestUrl);
  if (!response) return null;
  try {
    const value: unknown = await response.json();
    return isAssetPackManifest(value) ? withManifestBasePath(value, manifestUrl) : null;
  } catch {
    return null;
  }
}

export async function loadAssetPackManifest(manifestUrl = DEFAULT_ASSET_PACK_MANIFEST): Promise<AssetPackManifest | null> {
  try {
    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Asset pack manifest returned ${response.status}`);
    const value: unknown = await response.json();
    if (!isAssetPackManifest(value)) throw new Error("Asset pack manifest shape is invalid");
    const normalized = withManifestBasePath(value, manifestUrl);
    if (typeof caches !== "undefined") {
      const cache = await caches.open(ASSET_PACK_CACHE);
      await cache.put(manifestUrl, new Response(JSON.stringify(normalized), { headers: { "Content-Type": "application/json" } }));
    }
    return normalized;
  } catch {
    return readCachedManifest(manifestUrl);
  }
}

export function resolveAssetUrl(manifest: AssetPackManifest, assetId: string): string | null {
  const entry = manifest.entries[assetId];
  if (!entry) return null;
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const basePath = manifest.basePath ?? `/assets/packs/${manifest.id}/`;
  return new URL(entry.path, new URL(basePath.endsWith("/") ? basePath : `${basePath}/`, origin)).toString();
}

export function resolveAssetEntry(manifest: AssetPackManifest, assetId: string): AssetPackEntry | null {
  return manifest.entries[assetId] ?? null;
}

async function digestMatches(response: Response, expectedSha256?: string) {
  if (!expectedSha256 || typeof crypto === "undefined" || !crypto.subtle) return true;
  const bytes = await response.clone().arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const actual = Array.from(new Uint8Array(digest)).map(value => value.toString(16).padStart(2, "0")).join("");
  return actual === expectedSha256.toLowerCase();
}

export async function prepareAssetPack(
  manifestUrl = DEFAULT_ASSET_PACK_MANIFEST,
  onProgress?: (update: AssetPackProgress) => void,
): Promise<AssetPackResult> {
  const manifest = await loadAssetPackManifest(manifestUrl);
  if (!manifest) return { manifest: null, ready: false, cached: false, offline: typeof navigator !== "undefined" && navigator.onLine === false, failedAssetIds: [] };
  const offline = typeof navigator !== "undefined" && navigator.onLine === false;
  const entries = Object.entries(manifest.entries);
  const failedAssetIds: string[] = [];
  let cachedCount = 0;
  let loaded = 0;
  const cache = typeof caches !== "undefined" ? await caches.open(ASSET_PACK_CACHE) : null;
  for (const [assetId, entry] of entries) {
    const url = resolveEntryPath(manifestUrl, entry.path);
    const cached = Boolean(cache && await cache.match(url));
    if (cached) cachedCount += 1;
    if (!cached && offline) {
      failedAssetIds.push(assetId);
      loaded += 1;
      onProgress?.({ assetId, loaded, total: entries.length, progress: Math.round((loaded / entries.length) * 100), cached: false });
      continue;
    }
    try {
      const response = cached ? await cache!.match(url) : await fetch(url, { cache: "no-store" });
      if (!response?.ok || !(await digestMatches(response, entry.sha256))) throw new Error(`Asset failed: ${assetId}`);
      if (cache && !cached) await cache.put(url, response.clone());
    } catch {
      failedAssetIds.push(assetId);
    }
    loaded += 1;
    onProgress?.({ assetId, loaded, total: entries.length, progress: Math.round((loaded / entries.length) * 100), cached });
  }
  return {
    manifest,
    ready: failedAssetIds.length === 0,
    cached: cachedCount === entries.length && entries.length > 0,
    offline,
    failedAssetIds,
  };
}

export async function isAssetPackCached(manifestUrl = DEFAULT_ASSET_PACK_MANIFEST) {
  const manifest = await readCachedManifest(manifestUrl);
  if (!manifest || typeof caches === "undefined") return false;
  const cache = await caches.open(ASSET_PACK_CACHE);
  const assets = Object.values(manifest.entries);
  return assets.length > 0 && (await Promise.all(assets.map(entry => cache.match(resolveEntryPath(manifestUrl, entry.path))))).every(Boolean);
}
