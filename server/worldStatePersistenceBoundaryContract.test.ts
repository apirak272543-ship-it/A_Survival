import { describe, expect, it } from "vitest";
import {
  createWorldStateNamespace,
  evaluateWorldStatePersistenceBoundary,
  normalizeWorldStateOverridePatch,
  sameWorldStateNamespace,
} from "./worldStatePersistenceBoundaryContract";

describe("world-state persistence boundary contract", () => {
  it("creates an Obsidian-only map/player namespace", () => {
    const namespace = createWorldStateNamespace("obsidian-frontier", " player-a ");

    expect(namespace).toMatchObject({
      mapId: "obsidian-frontier",
      playerId: "player-a",
      key: "obsidian-frontier::player-a",
      valid: true,
      writeEligible: true,
      scope: "map-local-world-state",
      issues: [],
    });
  });

  it("fails closed for future maps and malformed player identities", () => {
    const future = evaluateWorldStatePersistenceBoundary({ mapId: "future-map", playerId: "" });

    expect(future.valid).toBe(false);
    expect(future.writeEligible).toBe(false);
    expect(future.namespace.key).toBeNull();
    expect(future.namespace.issues).toEqual([
      "map future-map is not runtime-approved for world-state writes",
      "playerId must be a non-empty string with at most 128 characters",
    ]);
    expect(future.runtimePolicy.futureMapWriteAllowed).toBe(false);
  });

  it("accepts coordinate-keyed module IDs and null tombstones without mutating generated data", () => {
    const result = evaluateWorldStatePersistenceBoundary({
      mapId: "obsidian-frontier",
      playerId: "player-a",
      worldBlockOverrides: { "2:1:2": "player.placed", "3:1:2": null },
    });

    expect(result.valid).toBe(true);
    expect(result.writeEligible).toBe(true);
    expect(result.patch).toEqual({
      valid: true,
      overrides: { "2:1:2": "player.placed", "3:1:2": null },
      invalidKeys: [],
      issues: [],
    });
    expect(result.runtimePolicy.generatedModuleMutated).toBe(false);
    expect(result.runtimePolicy.persistenceWritePerformed).toBe(false);
  });

  it("rejects malformed coordinates and unsupported override values deterministically", () => {
    const patch = normalizeWorldStateOverridePatch({ "not-a-coordinate": "player.placed", "1:2:3": 42, "4:5:6": " " });

    expect(patch.valid).toBe(false);
    expect(patch.overrides).toEqual({});
    expect(patch.invalidKeys).toEqual(["not-a-coordinate"]);
    expect(patch.issues).toEqual([
      "invalid world block coordinate key: not-a-coordinate",
      "world block override 1:2:3 must be null or a non-empty module id up to 128 characters",
      "world block override 4:5:6 must be null or a non-empty module id up to 128 characters",
    ]);
  });

  it("keeps map and player namespaces isolated", () => {
    const mapAPlayerA = createWorldStateNamespace("obsidian-frontier", "player-a");
    const mapAPlayerB = createWorldStateNamespace("obsidian-frontier", "player-b");
    const mapBPlayerA = createWorldStateNamespace("future-map", "player-a");

    expect(sameWorldStateNamespace(mapAPlayerA, mapAPlayerA)).toBe(true);
    expect(sameWorldStateNamespace(mapAPlayerA, mapAPlayerB)).toBe(false);
    expect(sameWorldStateNamespace(mapAPlayerA, mapBPlayerA)).toBe(false);
  });
});
