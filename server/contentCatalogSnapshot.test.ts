import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { DEFAULT_CONTENT_CATALOG_INPUT, createContentCatalogRegistry, type ContentCatalogOutput } from "./generators/contentCatalogGenerator";
import type { GeneratorArtifact } from "./generators/commonGeneratorApi";

type StoredCatalogArtifact = GeneratorArtifact<typeof DEFAULT_CONTENT_CATALOG_INPUT, ContentCatalogOutput>;

function readSnapshot() {
  const path = resolve(process.cwd(), "server/generators/generated/content-catalog-min-300.json");
  return JSON.parse(readFileSync(path, "utf8")) as StoredCatalogArtifact;
}

describe("stored content catalog snapshot", () => {
  it("loads the generated artifact, validates it, and preserves the expected content hash", () => {
    const registry = createContentCatalogRegistry();
    const artifact = readSnapshot();

    expect(artifact.output.definitions).toHaveLength(3000);
    expect(artifact.contentHash).toBe("76bc5d5001a0153ce3007b1a909f181409a9ce8cf2c5fba2534e857bf7a0bcfa");
    expect(registry.validate(artifact)).toEqual({ valid: true, issues: [] });
    expect(artifact.provenance.seed).toBe("content-library-min-300-v1");
  });
});
