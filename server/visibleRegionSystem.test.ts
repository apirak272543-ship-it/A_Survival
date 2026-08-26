import { describe, expect, it } from "vitest";
import { chunkKey, getVisibleChunkKeys } from "../client/src/game/systems/visibleRegionSystem";

describe("Arcane visible terrain regions", () => {
  it("maps the spawn area to the center chunk and includes a bounded radius", () => {
    const visible = getVisibleChunkKeys({ positionX: 0, positionZ: 0, terrainTiles: 64, tileSize: 2, chunkSize: 16, radiusChunks: 1 });
    expect(visible.has(chunkKey(2, 2))).toBe(true);
    expect(visible.size).toBe(9);
  });

  it("clips visible keys at the terrain boundary", () => {
    const visible = getVisibleChunkKeys({ positionX: -64, positionZ: -64, terrainTiles: 64, tileSize: 2, chunkSize: 16, radiusChunks: 2 });
    expect(visible.has(chunkKey(0, 0))).toBe(true);
    expect(visible.size).toBe(9);
    expect(Array.from(visible).every(key => key.split(":").every(value => Number(value) >= 0 && Number(value) < 4))).toBe(true);
  });
});
