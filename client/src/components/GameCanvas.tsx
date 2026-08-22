import { useEffect, useRef } from "react";
import { Engine } from "@babylonjs/core/Engines/engine";
import { createGameScene, type GameSnapshot, type GameHandle } from "@/game/scene";

type GameCanvasProps = {
  mapId: string;
  reducedMotion?: boolean;
  onSnapshot?: (snapshot: GameSnapshot) => void;
};

export default function GameCanvas({ mapId, reducedMotion, onSnapshot }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || startedRef.current) return;
    startedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, adaptToDeviceRatio: true });
    let handle: GameHandle | null = null;
    let cancelled = false;

    createGameScene(engine, canvas, { mapId, onSnapshot, reducedMotion }).then(game => {
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
  }, [mapId, onSnapshot, reducedMotion]);

  return <canvas ref={canvasRef} className="fixed inset-0 h-full w-full outline-none" style={{ touchAction: "none" }} />;
}
