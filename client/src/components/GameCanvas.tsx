import { useEffect, useRef } from "react";
import type { WorldBlockOverrides } from "@/game/systems/blockActionSystem";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameSnapshot, type GameHandle, type GameReward, type CompanionConfig, type BlockActionHandler } from "@/game/scene";
import { prepareAssetPack } from "@/game/assets/assetPackLoader";
import { setActiveAssetPackManifest } from "@/game/assets/pixelPack";

type GameCanvasProps = {
  mapId: string;
  reducedMotion?: boolean;
  onSnapshot?: (snapshot: GameSnapshot) => void;
  onReward?: (reward: GameReward) => void;
  onBlockAction?: BlockActionHandler;
  onBlockMessage?: (message: string) => void;
  worldBlockOverrides?: WorldBlockOverrides;
  companion?: CompanionConfig;
  renderDistance?: "near" | "balanced" | "far";
};

export default function GameCanvas({ mapId, reducedMotion, onSnapshot, onReward, onBlockAction, onBlockMessage, worldBlockOverrides, companion, renderDistance }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const latestPropsRef = useRef<GameCanvasProps>({ mapId, reducedMotion, onSnapshot, onReward, onBlockAction, onBlockMessage, worldBlockOverrides, companion, renderDistance });
  latestPropsRef.current = { mapId, reducedMotion, onSnapshot, onReward, onBlockAction, onBlockMessage, worldBlockOverrides, companion, renderDistance };

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
      const latest = latestPropsRef.current;
      const game = await createGameScene(engine, canvas, { mapId: latest.mapId, onSnapshot: latest.onSnapshot, onReward: latest.onReward, onBlockAction: latest.onBlockAction, onBlockMessage: latest.onBlockMessage, worldBlockOverrides: latest.worldBlockOverrides, companion: latest.companion, reducedMotion: latest.reducedMotion, renderDistance: latest.renderDistance });
      if (cancelled) {
        game.dispose();
        return;
      }
      handle = game;
      engine.runRenderLoop(() => game.scene.render());
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
  }, [mapId, onSnapshot, onReward, onBlockAction, onBlockMessage, companion, reducedMotion, renderDistance]);

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
