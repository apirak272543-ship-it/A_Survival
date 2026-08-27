import { describe, expect, it } from "vitest";
import {
  BLOCK_RECORD_ACTION_GRAPH_RULES_VERSION,
  buildBlockRecordActionDependencyGraph,
  getDefaultBlockRecordActionDependencyGraphInput,
} from "./generators/blockRecordActionDependencyGraph";

describe("block record and action dependency graph", () => {
  it("audits independent coordinate/state/action records across canonical block kinds", () => {
    const result = buildBlockRecordActionDependencyGraph(getDefaultBlockRecordActionDependencyGraphInput());

    expect(result.summary).toMatchObject({
      mapId: "obsidian-frontier",
      seed: 9107,
      radius: 16,
      blockDefinitionCount: 14,
      coordinateKeyRoundTrip: true,
      worldRecords: { uniqueKeys: true, keyMatchesCoordinates: true, moduleIdsPresent: true, hitPointsWithinBounds: true, statesKnown: true },
      treeLeaf: {
        treeTemplateCount: 2,
        hasLogAndLeafDefinitions: true,
        stageCoverage: { sapling: true, young: true, mature: true },
        treeRecordsInWorld: true,
        leafRecordsInWorld: true,
      },
      owners: { blockDefinitionCatalog: true, worldBlockRecordSchema: true, blockActionSystem: true, treeLeafTemplates: true, worldGenerator: true, playerUi: false, futureMapEnablement: false },
      runtimeImportAllowed: false,
      playerVisible: false,
      cacheable: false,
    });
    expect(result.summary.knownBlockKinds).toEqual(["leaf", "liquid", "log", "obstacle", "ore", "plant", "rock", "storage", "terrain"]);
    expect(result.summary.knownActions).toEqual(["break", "chop", "harvest"]);
    expect(result.summary.knownStates).toEqual(["intact", "damaged", "sapling", "young", "mature", "decaying", "broken"]);
    expect(result.graph.valid).toBe(true);
  });

  it("previews action, placement, and explicit coordinate override behavior from real helpers", () => {
    const result = buildBlockRecordActionDependencyGraph();

    expect(result.summary.actionPreview).toMatchObject({
      break: { action: "break", accepted: true, removed: true, correctToolDrop: "block-obsidian-slab" },
      chop: { action: "chop", accepted: true, removed: true, correctToolDrop: "block-obsidian-log" },
      harvest: { action: "harvest", accepted: true, removed: true, correctToolDrop: "block-obsidian-sprout" },
    });
    expect(result.summary.actionPreview.break.wrongToolDrop).toBeUndefined();
    expect(result.summary.placementPreview).toEqual({ acceptedWithSolidSupport: true, rejectedWithoutSupport: true, rejectedWhenOccupied: true, coordinateKey: "2:1:2", writesPerformed: false });
    expect(result.summary.normalizedOverridePreview).toEqual({ retainedRemovedCell: true, retainedKnownPlacement: true, rejectedUnknownModule: true, rejectedMalformedKey: true, writesPerformed: false });
  });

  it("keeps tree and leaf definitions independently addressable without claiming runtime mutation", () => {
    const result = buildBlockRecordActionDependencyGraph({ radius: 16 });

    expect(result.summary.worldBlockRecordCount).toBeGreaterThan(0);
    expect(result.summary.treeLeaf.hasLogAndLeafDefinitions).toBe(true);
    expect(result.summary.treeLeaf.treeRecordsInWorld).toBe(true);
    expect(result.summary.treeLeaf.leafRecordsInWorld).toBe(true);
    expect(result.summary.placementPreview.writesPerformed).toBe(false);
    expect(result.summary.normalizedOverridePreview.writesPerformed).toBe(false);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("is deterministic and changes audit content when seed or radius changes", () => {
    const input = { ...getDefaultBlockRecordActionDependencyGraphInput(), rulesVersion: BLOCK_RECORD_ACTION_GRAPH_RULES_VERSION };
    const first = buildBlockRecordActionDependencyGraph(input);
    const second = buildBlockRecordActionDependencyGraph(input);
    const changedSeed = buildBlockRecordActionDependencyGraph({ ...input, seed: 9108 });
    const changedRadius = buildBlockRecordActionDependencyGraph({ ...input, radius: 8 });

    expect(first).toEqual(second);
    expect(first.artifact.contentHash).not.toBe(changedSeed.artifact.contentHash);
    expect(first.artifact.contentHash).not.toBe(changedRadius.artifact.contentHash);
  });

  it("rejects future maps, unsupported rules, invalid seeds, and out-of-bounds radius", () => {
    expect(() => buildBlockRecordActionDependencyGraph({ mapId: "future-map" })).toThrow(/Only obsidian-frontier/);
    expect(() => buildBlockRecordActionDependencyGraph({ rulesVersion: "future-rules" })).toThrow(/Unsupported/);
    expect(() => buildBlockRecordActionDependencyGraph({ seed: 1.25 })).toThrow(/seed/);
    expect(() => buildBlockRecordActionDependencyGraph({ radius: 3 })).toThrow(/radius/);
    expect(() => buildBlockRecordActionDependencyGraph({ radius: 33 })).toThrow(/radius/);
  });
});
