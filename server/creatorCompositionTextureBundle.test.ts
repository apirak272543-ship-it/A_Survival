import { describe, expect, it } from "vitest";
import { buildDeterministicZip } from "./creatorCompositionTextureBundle";

describe("creator composition texture bundle", () => {
  it("builds the same ZIP bytes regardless of input order", () => {
    const first = buildDeterministicZip([
      { path: "textures/fern.png", bytes: Buffer.from([1, 2, 3]) },
      { path: "manifest.json", bytes: Buffer.from('{"ok":true}\n', "utf8") },
    ]);
    const second = buildDeterministicZip([
      { path: "manifest.json", bytes: Buffer.from('{"ok":true}\n', "utf8") },
      { path: "textures/fern.png", bytes: Buffer.from([1, 2, 3]) },
    ]);

    expect(second).toEqual(first);
    expect(first.files).toEqual(["manifest.json", "textures/fern.png"]);
    expect(first.bytes.subarray(0, 4)).toEqual(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    expect(first.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("rejects duplicate and traversal archive paths", () => {
    expect(() => buildDeterministicZip([
      { path: "manifest.json", bytes: Buffer.from("a") },
      { path: "manifest.json", bytes: Buffer.from("b") },
    ])).toThrow("Duplicate ZIP archive path");
    expect(() => buildDeterministicZip([{ path: "../manifest.json", bytes: Buffer.from("a") }])).toThrow("Unsafe ZIP archive path");
    expect(() => buildDeterministicZip([{ path: "", bytes: Buffer.from("a") }])).toThrow("Unsafe ZIP archive path");
  });
});
