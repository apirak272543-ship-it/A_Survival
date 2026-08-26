import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameSnapshot, type GameHandle, type GameReward, type CompanionConfig } from "@/game/scene";
import { prepareAssetPack } from "@/game/assets/assetPackLoader";
import { setActiveAssetPackManifest } from "@/game/assets/pixelPack";

type GameCanvasProps = {
  mapId: string;
  reducedMotion?: boolean;
  onSnapshot?: (snapshot: GameSnapshot) => void;
  onReward?: (reward: GameReward) => void;
  companion?: CompanionConfig;
  renderDistance?: "near" | "balanced" | "far";
};

export default function GameCanvas({ mapId, reducedMotion, onSnapshot, onReward, companion, renderDistance }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

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
      const game = await createGameScene(engine, canvas, { mapId, onSnapshot, onReward, companion, reducedMotion, renderDistance });
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
  }, [mapId, onSnapshot, onReward, companion, reducedMotion, renderDistance]);

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
