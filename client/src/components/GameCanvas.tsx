import { useEffect, useRef } from "react";
import type { WorldBlockOverrides } from "@/game/systems/blockActionSystem";
import type { WorldFarmState } from "@/game/systems/worldFarmSystem";
import type { CameraMode, ViewDistanceBlocks } from "@/game/systems/cameraModes";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameSnapshot, type GameHandle, type GameReward, type CompanionConfig, type BlockActionHandler, type FarmActionHandler } from "@/game/scene";
import { prepareAssetPack } from "@/game/assets/assetPackLoader";
import { setActiveAssetPackManifest } from "@/game/assets/pixelPack";
import type { BlockToolTag, WorldBlock } from "@/game/data/blockModules";
import type { ItemInstance } from "@/game/data/catalog";
import type { WorldPlantState } from "@/game/systems/worldFarmingSystem";
import { getPerformanceBudget, type PerformanceTier } from "@/game/systems/performanceProfile";

type GameCanvasProps = {
  mapId: string;
  reducedMotion?: boolean;
  performanceTier?: PerformanceTier;
  onSnapshot?: (snapshot: GameSnapshot) => void;
  onReward?: (reward: GameReward) => void;
  onBlockAction?: BlockActionHandler;
  onBlockMessage?: (message: string) => void;
  onFarmAction?: FarmActionHandler;
  onFarmMessage?: (message: string) => void;
  onChestOpen?: (chestId: string) => void;
  worldBlockOverrides?: WorldBlockOverrides;
  worldFarmState?: WorldFarmState;
  companion?: CompanionConfig;
  renderDistance?: "near" | "balanced" | "far";
  viewDistanceBlocks?: ViewDistanceBlocks | number;
  targetFps?: number;
  cameraMode?: CameraMode;
  paused?: boolean;
  selectedToolTag?: BlockToolTag;
  selectedItemDefinitionId?: string;
  initialWorldBlockOverrides?: Record<string, WorldBlock | null>;
  initialWorldPlants?: Record<string, WorldPlantState>;
  initialWorldStorageById?: Record<string, ItemInstance[]>;
  onItemConsumed?: (definitionId: string) => void;
  onWorldBlockMutation?: (key: string, block: WorldBlock | null) => void;
  onWorldPlantMutation?: (key: string, plant: WorldPlantState | null) => void;
  onWorldStorageOpen?: (storageId: string) => void;
};

export default function GameCanvas(props: GameCanvasProps) {
  const { mapId, reducedMotion, performanceTier, renderDistance, cameraMode, viewDistanceBlocks } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const performanceBudgetRef = useRef(getPerformanceBudget(performanceTier, viewDistanceBlocks, props.targetFps));
  const startedRef = useRef(false);
  const latestPropsRef = useRef<GameCanvasProps>(props);
  latestPropsRef.current = props;

  useEffect(() => {
    performanceBudgetRef.current = getPerformanceBudget(performanceTier, viewDistanceBlocks, props.targetFps);
  }, [performanceTier, viewDistanceBlocks, props.targetFps]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: false, stencil: true, adaptToDeviceRatio: false });
    const resizeEngine = () => {
      // Keep the browser game lightweight while preserving crisp pixel silhouettes.
      engine.setHardwareScalingLevel(window.innerWidth <= 960 ? 1.25 : 1.15);
      engine.resize();
    };
    resizeEngine();
    let handle: GameHandle | null = null;
    let cancelled = false;

    const startGame = async () => {
      const pack = await prepareAssetPack();
      setActiveAssetPackManifest(pack.manifest);
      if (pack.failedAssetIds.length > 0) {
        console.warn("Asset pack used fallback entries", pack.failedAssetIds);
      }
      if (cancelled) return;
      const game = await createGameScene(engine, canvas, {
        get mapId() { return latestPropsRef.current.mapId; },
        get onSnapshot() { return latestPropsRef.current.onSnapshot; },
        get onReward() { return latestPropsRef.current.onReward; },
        get onBlockAction() { return latestPropsRef.current.onBlockAction; },
        get onBlockMessage() { return latestPropsRef.current.onBlockMessage; },
        get onFarmAction() { return latestPropsRef.current.onFarmAction; },
        get onFarmMessage() { return latestPropsRef.current.onFarmMessage; },
        get onChestOpen() { return latestPropsRef.current.onChestOpen; },
        get worldBlockOverrides() { return latestPropsRef.current.worldBlockOverrides; },
        get worldFarmState() { return latestPropsRef.current.worldFarmState; },
        get companion() { return latestPropsRef.current.companion; },
        get reducedMotion() { return latestPropsRef.current.reducedMotion; },
        get performanceTier() { return latestPropsRef.current.performanceTier; },
        get renderDistance() { return latestPropsRef.current.renderDistance; },
        get viewDistanceBlocks() { return latestPropsRef.current.viewDistanceBlocks; },
        get targetFps() { return latestPropsRef.current.targetFps; },
        get cameraMode() { return latestPropsRef.current.cameraMode; },
        get paused() { return latestPropsRef.current.paused; },
        get selectedToolTag() { return latestPropsRef.current.selectedToolTag; },
        get selectedItemDefinitionId() { return latestPropsRef.current.selectedItemDefinitionId; },
        get initialWorldBlockOverrides() { return latestPropsRef.current.initialWorldBlockOverrides; },
        get initialWorldPlants() { return latestPropsRef.current.initialWorldPlants; },
        get initialWorldStorageById() { return latestPropsRef.current.initialWorldStorageById; },
        get onItemConsumed() { return latestPropsRef.current.onItemConsumed; },
        get onWorldBlockMutation() { return latestPropsRef.current.onWorldBlockMutation; },
        get onWorldPlantMutation() { return latestPropsRef.current.onWorldPlantMutation; },
        get onWorldStorageOpen() { return latestPropsRef.current.onWorldStorageOpen; },
      });
      if (cancelled) {
        game.dispose();
        return;
      }
      handle = game;
      let lastRenderedAt = -Infinity;
      engine.runRenderLoop(() => {
        const now = performance.now();
        const targetFps = performanceBudgetRef.current.targetFps;
        if (now - lastRenderedAt < 1000 / targetFps) return;
        lastRenderedAt = now;
        game.scene.render();
      });
    };
    void startGame().catch(error => console.error("[GameCanvas] scene startup failed", error));

    const onResize = () => resizeEngine();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      setActiveAssetPackManifest(null);
      engine.dispose();
      startedRef.current = false;
    };
  }, [mapId, reducedMotion, renderDistance]);

  useEffect(() => {
    if (!startedRef.current || !cameraMode) return;
    window.dispatchEvent(new CustomEvent("arcane-control", { detail: { type: "set-camera-mode", mode: cameraMode } }));
  }, [cameraMode]);

  useEffect(() => {
    if (!startedRef.current || !viewDistanceBlocks) return;
    window.dispatchEvent(new CustomEvent("arcane-control", { detail: { type: "set-view-distance", blocks: viewDistanceBlocks } }));
  }, [viewDistanceBlocks]);

  return (
    <div className="game-viewport">
      <canvas ref={canvasRef} className="fixed inset-0 h-full w-full outline-none" style={{ touchAction: "none" }} />
      <button
        className="fullscreen-toggle"
        onClick={() => {
          if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
          } else {
            document.exitFullscreen().catch(() => {});
          }
        }}
        aria-label="Toggle fullscreen"
      >
        ⛶
      </button>
    </div>
  );
}
