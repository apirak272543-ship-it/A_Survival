import type { WorldBlock } from "@/game/data/blockModules";

export type ObsidianWorldModuleManifest = {
  mapId: "obsidian-frontier";
  profileId: string;
  generatorVersion: string;
  seed: number;
  radius: number;
  chunkSize: number;
  worldHash: string;
  blockFirst: true;
};

export type ObsidianTerrainCell = {
  x: number;
  z: number;
  surfaceY: number;
  elevation: number;
  slope: number;
  moisture: number;
  temperature: number;
  biome: string;
  topBlockId: string;
};

export type ObsidianWorldModule = {
  manifest: ObsidianWorldModuleManifest;
  blocks: WorldBlock[];
  terrain: ObsidianTerrainCell[];
  water: Array<{ id: string; x: number; y: number; z: number; kind: string; flowDirection: string }>;
  resources: Array<{ id: string; x: number; y: number; z: number; definitionId: string; rarity: string; biome: string }>;
  caves: Array<{ id: string; entranceX: number; entranceY: number; entranceZ: number; depth: number; branchCount: number; biome: string }>;
  structures: Array<{ id: string; kind: string; x: number; y: number; z: number; radius: number; biome: string; linkedStructureId?: string }>;
  spawnPoints: Array<{ id: string; x: number; y: number; z: number; role: string; species: string; biome: string; structureId?: string }>;
  metadata: Record<string, unknown> & { blockFirst: true; deterministic: true; playerFacingWorldGenerationUi: false; spatialRulesVersion?: string };
};

const DEFAULT_MODULE_BASE = "/assets/worlds/obsidian-frontier/seed-9107";

export function applyWorldBlockOverrides(blocks: WorldBlock[], overrides: Record<string, WorldBlock | null> = {}) {
  const next = new Map(blocks.map(block => [block.key, block]));
  Object.entries(overrides).forEach(([key, block]) => {
    if (block) next.set(key, block);
    else next.delete(key);
  });
  return Array.from(next.values());
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { credentials: "same-origin", cache: "force-cache" });
  if (!response.ok) throw new Error(`Obsidian world module request failed: ${response.status}`);
  return response.json() as Promise<T>;
}

export async function loadObsidianWorldModule(base = DEFAULT_MODULE_BASE): Promise<ObsidianWorldModule> {
  const [manifest, blocks, terrain, water, resources, caves, structures, spawnPoints, metadata] = await Promise.all([
    fetchJson<ObsidianWorldModuleManifest>(`${base}/manifest.json`),
    fetchJson<WorldBlock[]>(`${base}/blocks.json`),
    fetchJson<ObsidianTerrainCell[]>(`${base}/terrain.json`),
    fetchJson<ObsidianWorldModule["water"]>(`${base}/water.json`),
    fetchJson<ObsidianWorldModule["resources"]>(`${base}/resources.json`),
    fetchJson<ObsidianWorldModule["caves"]>(`${base}/caves.json`),
    fetchJson<ObsidianWorldModule["structures"]>(`${base}/structures.json`),
    fetchJson<ObsidianWorldModule["spawnPoints"]>(`${base}/spawns.json`),
    fetchJson<ObsidianWorldModule["metadata"]>(`${base}/metadata.json`),
  ]);
  if (manifest.mapId !== "obsidian-frontier" || manifest.blockFirst !== true || metadata.blockFirst !== true || metadata.deterministic !== true || metadata.playerFacingWorldGenerationUi !== false) {
    throw new Error("Obsidian world module failed runtime safety contract");
  }
  if (!Number.isFinite(manifest.seed) || manifest.radius < 1 || manifest.radius > 500 || blocks.some(block => Math.abs(block.x) > manifest.radius || Math.abs(block.z) > manifest.radius)) {
    throw new Error("Obsidian world module contains out-of-bounds blocks");
  }
  return { manifest, blocks, terrain, water, resources, caves, structures, spawnPoints, metadata };
}
