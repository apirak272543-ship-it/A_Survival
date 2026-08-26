import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createStarterTexturePackInput,
  decodeRgbaPng,
  migrateStarterTexturePack,
} from "./generators/migrateStarterTexturePack";

const SOURCE_ROOT = resolve(process.cwd(), "client/public/assets/packs/a-survival-content-library-v0-1");

describe("starter texture pack migration", () => {
  it("decodes the procedural starter pack into the texture builder input contract", async () => {
    const input = await createStarterTexturePackInput(SOURCE_ROOT);

    expect(input.id).toBe("a-survival-content-library-builder-v0-1");
    expect(input.assets).toHaveLength(16);
    expect(input.assets.every(asset => asset.source === "starter-authored")).toBe(true);
    expect(input.assets.every(asset => asset.provenanceRef === "ASSETS.md#procedural-starter-texture-pack")).toBe(true);
    expect(input.assets.filter(asset => asset.kind === "tile")).toHaveLength(4);
    expect(input.assets.filter(asset => asset.kind === "icon")).toHaveLength(12);
    expect(input.assets.every(asset => asset.layers.length === 1 && asset.layers[0]!.rgba.length === asset.width * asset.height * 4)).toBe(true);
  });

  it("writes Builder-owned PNGs and a tamper-checkable manifest", async () => {
    const targetRoot = await mkdtemp(join(tmpdir(), "a-survival-starter-builder-"));
    try {
      const result = await migrateStarterTexturePack({ sourceRoot: SOURCE_ROOT, targetRoot });
      const manifest = JSON.parse(await readFile(join(targetRoot, "manifest.json"), "utf8")) as typeof result.output.manifest;
      const provenance = JSON.parse(await readFile(join(targetRoot, "provenance.json"), "utf8")) as typeof result.provenance;
      const first = result.output.assets[0]!;
      const firstBytes = await readFile(join(targetRoot, first.relativePath));
      const decoded = decodeRgbaPng(firstBytes);

      expect(result.output.assets).toHaveLength(16);
      expect(manifest).toEqual(result.output.manifest);
      expect(provenance.builderGeneratorId).toBe("texture.pack");
      expect(provenance.sourceArtStatus).toBe("procedural-starter-authored");
      expect(provenance.usage).toContain("future-library-only");
      expect(firstBytes.subarray(0, 8)).toEqual(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      expect(decoded.width).toBe(first.width);
      expect(decoded.height).toBe(first.height);
      expect(manifest.entries[first.assetId]?.sha256).toBe(first.sha256);
      expect(provenance.outputPackSha256).toBe(result.output.manifest.packSha256);
    } finally {
      await rm(targetRoot, { recursive: true, force: true });
    }
  });
});
