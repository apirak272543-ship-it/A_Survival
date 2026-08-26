import { describe, expect, it } from "vitest";
import { chunkKey, getStreamingChunkCoordinate, getStreamingChunkKeys, getVisibleChunkKeys } from "../client/src/game/systems/visibleRegionSystem";

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

  it("keeps the 96m visible window centered on the player", () => {
    const visible = getStreamingChunkKeys({ positionX: 0, positionZ: 0, chunkWorldSize: 16, visibleRadiusMeters: 96, mapRadiusMeters: 500 });
    expect(visible.size).toBe(169);
    expect(visible.has(chunkKey(-6, -6))).toBe(true);
    expect(visible.has(chunkKey(6, 6))).toBe(true);
    expect(visible.has(chunkKey(-7, 0))).toBe(false);
  });

  it("clips the visible window to the 500m map boundary", () => {
    const visible = getStreamingChunkKeys({ positionX: 500, positionZ: 500, chunkWorldSize: 16, visibleRadiusMeters: 96, mapRadiusMeters: 500 });
    expect(visible.has(chunkKey(32, 32))).toBe(true);
    expect(visible.has(chunkKey(33, 32))).toBe(false);
    expect(Array.from(visible).every(key => key.split(":").every(value => Math.abs(Number(value)) <= 32))).toBe(true);
  });

  it("moves the stream center exactly when crossing a 16m chunk boundary", () => {
    expect(getStreamingChunkCoordinate(15.99, 16)).toBe(0);
    expect(getStreamingChunkCoordinate(16, 16)).toBe(1);
    const before = getStreamingChunkKeys({ positionX: 15.99, positionZ: 0, chunkWorldSize: 16, visibleRadiusMeters: 0, mapRadiusMeters: 500 });
    const after = getStreamingChunkKeys({ positionX: 16, positionZ: 0, chunkWorldSize: 16, visibleRadiusMeters: 0, mapRadiusMeters: 500 });
    expect(before.has(chunkKey(0, 0))).toBe(true);
    expect(after.has(chunkKey(1, 0))).toBe(true);
    expect(after.has(chunkKey(0, 0))).toBe(false);
  });
});
