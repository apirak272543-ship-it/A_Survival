import type { AbstractMesh } from "@babylonjs/core/Meshes/abstractMesh";
import { Mesh } from "@babylonjs/core/Meshes/mesh";
import { Scene } from "@babylonjs/core/scene";
import { LoadAssetContainerAsync } from "@babylonjs/core/Loading/sceneLoader";
import { createVoxelModel, type PixelModelId } from "@/game/assets/pixelPack";
import { DEFAULT_ASSET_PACK_MANIFEST, loadAssetPackManifest, resolveAssetEntry, resolveAssetUrl } from "@/game/assets/assetPackLoader";

export type PackModelOptions = {
  position?: { x: number; y: number; z: number };
  scale?: number;
  name?: string;
};

const sceneContainerPromises = new WeakMap<Scene, Map<PixelModelId, ReturnType<typeof LoadAssetContainerAsync>>>();
let packManifestPromise: ReturnType<typeof loadAssetPackManifest> | null = null;

function getPackManifest() {
  packManifestPromise ??= loadAssetPackManifest(DEFAULT_ASSET_PACK_MANIFEST);
  return packManifestPromise;
}

async function loadContainer(scene: Scene, modelId: PixelModelId) {
  let containerPromises = sceneContainerPromises.get(scene);
  if (!containerPromises) {
    containerPromises = new Map();
    sceneContainerPromises.set(scene, containerPromises);
  }
  const existing = containerPromises.get(modelId);
  if (existing) return existing;
  const promise = (async () => {
    const manifest = await getPackManifest();
    const assetId = `models.${modelId}`;
    const entry = manifest ? resolveAssetEntry(manifest, assetId) : null;
    if (!manifest || !entry || entry.kind !== "model") {
      throw new Error(`Asset pack model entry is unavailable: ${assetId}`);
    }
    const url = resolveAssetUrl(manifest, assetId);
    if (!url) throw new Error(`Asset pack model URL is unavailable: ${assetId}`);
    await import("@babylonjs/loaders/glTF/2.0");
    return LoadAssetContainerAsync(url, scene);
  })();
  containerPromises.set(modelId, promise);
  return promise;
}

function attachLoadedVisual(scene: Scene, root: Mesh, fallback: AbstractMesh, modelId: PixelModelId, prefix: string, scale: number) {
  void loadContainer(scene, modelId).then(container => {
    if (root.isDisposed()) return;
    const visualRoot = new Mesh(`${prefix}-glb-visual`, scene);
    container.instantiateModelsToScene(name => `${prefix}-${name}`, true).rootNodes.forEach(node => { node.parent = visualRoot; });
    visualRoot.parent = root;
    visualRoot.position.set(0, 0, 0);
    visualRoot.scaling.setAll(1 / scale);
    fallback.setEnabled(false);
    root.metadata = { ...root.metadata, source: "glb-pack", loaded: true };
  }).catch(error => {
    console.warn(`[AssetPack] GLB ${modelId} unavailable; using voxel fallback`, error);
  });
}

export async function loadPackModel(scene: Scene, modelId: PixelModelId, options: PackModelOptions = {}): Promise<AbstractMesh> {
  const prefix = options.name ?? `pack-${modelId}`;
  const scale = options.scale ?? 1;
  const root = new Mesh(prefix, scene);
  root.position.set(options.position?.x ?? 0, options.position?.y ?? 0, options.position?.z ?? 0);
  root.scaling.setAll(scale);
  root.metadata = { assetPack: "arcane-frontier-voxel-pixel", assetId: `models.${modelId}`, modelId, source: "voxel-fallback", loaded: false };

  const fallback = createVoxelModel(scene, modelId, { name: `${prefix}-fallback` });
  fallback.parent = root;
  fallback.position.set(0, 0, 0);
  fallback.scaling.setAll(1);
  attachLoadedVisual(scene, root, fallback, modelId, prefix, scale);
  return root;
}
