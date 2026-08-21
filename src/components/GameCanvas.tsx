import { useEffect, useRef } from 'react';
import { Engine } from '@babylonjs/core/Engines/engine';
import { Scene } from '@babylonjs/core/scene';
import { ArcRotateCamera } from '@babylonjs/core/Cameras/arcRotateCamera';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { MeshBuilder } from '@babylonjs/core/Meshes/meshBuilder';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || initializedRef.current) return;
    initializedRef.current = true;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor.set(0.06, 0.13, 0.10, 1);
    const camera = new ArcRotateCamera('camera', -1.1, 1.18, 18, new Vector3(0, 0, 0), scene);
    camera.attachControl(canvas, true);
    new HemisphericLight('sun', new Vector3(0.2, 1, 0.1), scene).intensity = 1.25;
    const ground = MeshBuilder.CreateGround('ground', { width: 30, height: 30 }, scene);
    const grass = new StandardMaterial('grass', scene); grass.diffuseColor = new Color3(0.16, 0.29, 0.16); ground.material = grass;
    const camp = MeshBuilder.CreateCylinder('campfire', { diameter: 1.1, height: 0.7, tessellation: 8 }, scene); camp.position.y = 0.35;
    const fire = new StandardMaterial('fire', scene); fire.emissiveColor = new Color3(1, 0.27, 0.02); camp.material = fire;
    for (const [x, z] of [[-6, -4], [5, -3], [6, 5], [-5, 4]] as Array<[number, number]>) {
      const tree = MeshBuilder.CreateCylinder(`tree-${x}`, { diameterTop: 0, diameterBottom: 2.1, height: 5, tessellation: 5 }, scene);
      tree.position.set(x, 2.5, z);
      const leaf = new StandardMaterial(`leaf-${x}`, scene); leaf.diffuseColor = new Color3(0.07, 0.24, 0.12); tree.material = leaf;
    }
    engine.runRenderLoop(() => scene.render());
    const onResize = () => engine.resize(); window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); scene.dispose(); engine.dispose(); initializedRef.current = false; };
  }, []);

  return <canvas ref={canvasRef} className="game-canvas" aria-label="ฉากทดสอบ A_Survival" />;
}
