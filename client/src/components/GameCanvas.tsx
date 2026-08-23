import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameSnapshot, type GameHandle, type GameReward, type CompanionConfig } from "@/game/scene";

type GameCanvasProps = {
  mapId: string;
  reducedMotion?: boolean;
  onSnapshot?: (snapshot: GameSnapshot) => void;
  onReward?: (reward: GameReward) => void;
  companion?: CompanionConfig;
};

export default function GameCanvas({ mapId, reducedMotion, onSnapshot, onReward, companion }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let cancelled = false;

    createGameScene(engine, canvas, { mapId, onSnapshot, onReward, companion, reducedMotion }).then(game => {
      if (cancelled) {
        game.dispose();
        return;
      }
      handle = game;
      engine.runRenderLoop(() => game.scene.render());
    });

    const onResize = () => engine.resize();
    window.addEventListener("resize", onResize);
    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      handle?.dispose();
      engine.dispose();
      startedRef.current = false;
    };
  }, [mapId, onSnapshot, onReward, companion, reducedMotion]);

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
