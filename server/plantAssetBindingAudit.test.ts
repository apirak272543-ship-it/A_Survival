import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { ASSET_CREDITS, type AssetCredit } from "../client/src/game/data/assetProvenance";
import { PLANT_CATALOG, type PlantDefinition } from "../client/src/game/data/plantCatalog";
import type { AssetPackManifest } from "../client/src/game/assets/assetPackLoader";
import { auditPlantAssetBindings, type PlantAssetBindingAuditInput } from "./generators/plantAssetBindingAudit";

const manifest = JSON.parse(readFileSync(resolve(process.cwd(), "client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json"), "utf8")) as AssetPackManifest;
const firstPlant = PLANT_CATALOG.find(plant => plant.family === "flower")!;

function fixtureInput(overrides: Partial<PlantAssetBindingAuditInput> = {}): PlantAssetBindingAuditInput {
  const plantAssetId = firstPlant.assetId;
  const seedAssetId = "items.seed";
  const credits: AssetCredit[] = [
    {
      assetId: plantAssetId,
      category: "plant",
      title: "Original plant texture",
      creator: "A_Survival project",
      license: "Project-authored",
      status: "project-original",
      attribution: "A_Survival project",
    },
    {
      assetId: seedAssetId,
      category: "item",
      title: "Original seed icon",
      creator: "A_Survival project",
      license: "Project-authored",
      status: "project-original",
      attribution: "A_Survival project",
    },
  ];
  return {
    plants: [firstPlant],
    manifest: {
      id: "arcane-frontier-voxel-pixel",
      version: "test",
      entries: {
        [plantAssetId]: { kind: "texture", path: "art/plant.png", sha256: "a".repeat(64) },
        [seedAssetId]: { kind: "texture", path: "items/seed.png", sha256: "b".repeat(64) },
      },
    },
    credits,
    ...overrides,
  };
}

describe("plant asset binding audit", () => {
  it("audits all canonical plants against the actual active manifest without treating metadata as provenance", () => {
    const result = auditPlantAssetBindings({ plants: PLANT_CATALOG, manifest, credits: ASSET_CREDITS });
    expect(result.artifact.manifestId).toBe("arcane-frontier-voxel-pixel");
    expect(result.summary.plantCount).toBe(300);
    expect(result.summary.bindingCount).toBe(600);
    expect(result.bindings.every(binding => binding.manifestKind === "texture")).toBe(true);
    expect(result.summary.issueCounts.MISSING_MANIFEST_ENTRY).toBe(0);
    expect(result.summary.issueCounts.MANIFEST_KIND_MISMATCH).toBe(0);
    expect(result.summary.issueCounts.MISSING_PROVENANCE).toBe(600);
    expect(result.summary.verifiedBindingCount).toBe(0);
    expect(result.summary.blockerCount).toBe(600);
  });

  it("returns the same ordered audit and hash when source arrays are reordered", () => {
    const input = fixtureInput();
    const first = auditPlantAssetBindings(input);
    const reordered = auditPlantAssetBindings({ ...input, plants: [...input.plants].reverse(), credits: [...input.credits].reverse() });
    expect(reordered).toEqual(first);
  });

  it("marks exact manifest and distributable provenance bindings as verified", () => {
    const result = auditPlantAssetBindings(fixtureInput());
    expect(result.issues).toEqual([]);
    expect(result.summary).toMatchObject({ plantCount: 1, bindingCount: 2, verifiedBindingCount: 2, blockerCount: 0 });
    expect(result.bindings.every(binding => binding.status === "verified")).toBe(true);
  });

  it("reports missing entries and kind mismatches as blockers with fail-closed precedence", () => {
    const plant = { ...firstPlant, assetId: "missing.plant" } satisfies PlantDefinition;
    const result = auditPlantAssetBindings({
      ...fixtureInput(),
      plants: [plant],
      manifest: {
        id: "arcane-frontier-voxel-pixel",
        version: "test",
        entries: { "items.seed": { kind: "model", path: "items/seed.glb" } },
      },
      credits: [{ ...fixtureInput().credits[1]!, status: "awaiting-contact" }],
    });
    expect(result.summary.issueCounts.MISSING_MANIFEST_ENTRY).toBe(1);
    expect(result.summary.issueCounts.MANIFEST_KIND_MISMATCH).toBe(1);
    expect(result.summary.issueCounts.UNVERIFIED_PROVENANCE).toBe(0);
    expect(result.summary.blockerCount).toBe(2);
    expect(result.bindings.map(binding => binding.status).sort()).toEqual(["kind-mismatch", "missing-manifest"]);
  });

  it("reports non-distributable provenance when the manifest kind is valid", () => {
    const result = auditPlantAssetBindings({
      ...fixtureInput(),
      credits: [{ ...fixtureInput().credits[0]! }, { ...fixtureInput().credits[1]!, status: "awaiting-contact" }],
    });
    expect(result.summary.issueCounts.UNVERIFIED_PROVENANCE).toBe(1);
    expect(result.bindings.find(binding => binding.role === "seed")?.status).toBe("unverified-provenance");
  });

  it("changes the content hash when a binding input changes", () => {
    const input = fixtureInput();
    const original = auditPlantAssetBindings(input);
    const changed = auditPlantAssetBindings({
      ...input,
      manifest: {
        ...input.manifest,
        entries: { ...input.manifest.entries, [firstPlant.assetId]: { kind: "texture", path: "art/changed.png", sha256: "c".repeat(64) } },
      },
    });
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
  });
});
