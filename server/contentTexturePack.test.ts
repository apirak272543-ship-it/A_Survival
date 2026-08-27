import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

type TextureEntry = {
  kind: "icon" | "terrain";
  path: string;
  mime: "image/png";
  sha256: string;
  source: "procedural-starter-authored";
  provenanceRef: string;
};

type TextureManifest = {
  schemaVersion: number;
  id: string;
  namespace: string;
  version: string;
  designSource: string;
  artStatus: string;
  textureSampling: string;
  tileSize: number;
  entries: Record<string, TextureEntry>;
  usage: string;
  packSha256: string;
};

const packRoot = resolve(process.cwd(), "client/public/assets/packs/a-survival-content-library-v0-1");
const manifest = JSON.parse(readFileSync(resolve(packRoot, "manifest.json"), "utf8")) as TextureManifest;

function sha256File(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(item => stableJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value as Record<string, unknown>).sort().map(key => `${JSON.stringify(key)}:${stableJson((value as Record<string, unknown>)[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

describe("A_Survival content texture pack", () => {
  it("declares a separate future-library namespace and expected generated starter entries", () => {
    expect(manifest.id).toBe("a-survival-content-library-v0-1");
    expect(manifest.namespace).toBe("afc");
    expect(manifest.version).toBe("0.1.0");
    expect(manifest.artStatus).toBe("procedural-starter-authored");
    expect(manifest.usage).toContain("future-library-only");
    expect(Object.keys(manifest.entries)).toHaveLength(16);
    expect(Object.values(manifest.entries).filter(entry => entry.kind === "terrain")).toHaveLength(4);
    expect(Object.values(manifest.entries).filter(entry => entry.kind === "icon")).toHaveLength(12);
  });

  it("keeps every generated file inside the pack and matches its digest/provenance", () => {
    for (const entry of Object.values(manifest.entries)) {
      expect(entry.path.startsWith("/")).toBe(false);
      expect(entry.path.includes(".."), entry.path).toBe(false);
      const filePath = resolve(packRoot, entry.path);
      expect(filePath.startsWith(packRoot)).toBe(true);
      expect(existsSync(filePath)).toBe(true);
      expect(entry.mime).toBe("image/png");
      expect(entry.source).toBe("procedural-starter-authored");
      expect(entry.provenanceRef).toBe("ASSETS.md#procedural-starter-texture-pack");
      expect(entry.sha256).toBe(sha256File(filePath));
    }
  });

  it("uses a deterministic hash over the canonical manifest without packSha256", () => {
    const { packSha256: _packSha256, ...manifestWithoutHash } = manifest;
    const expected = createHash("sha256").update(stableJson(manifestWithoutHash)).digest("hex");
    expect(manifest.packSha256).toBe(expected);
  });
});
