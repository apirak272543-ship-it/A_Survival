import { describe, expect, it } from "vitest";
import { evaluateToolAwareBlockDrop, isToolAwareDropConsistent } from "./toolAwareBlockDropBoundaryContract";

describe("tool-aware block drop boundary contract", () => {
  it("returns a placeable block item for a matching pickaxe", () => {
    const result = evaluateToolAwareBlockDrop({ blockId: "rock.obsidian.small", toolTag: "pickaxe" });

    expect(result).toMatchObject({
      valid: true,
      accepted: true,
      requiredToolTag: "pickaxe",
      toolTag: "pickaxe",
      usedCorrectTool: true,
      dropKind: "block-item",
      dropDefinitionId: "block-obsidian-pebble",
      dropQuantity: 1,
      placeableBlockItem: true,
    });
    expect(isToolAwareDropConsistent(result)).toBe(true);
  });

  it("does not return a block drop for an incorrect or absent tool", () => {
    const wrongTool = evaluateToolAwareBlockDrop({ blockId: "wood.obsidian.log", toolTag: "pickaxe" });
    const absentTool = evaluateToolAwareBlockDrop({ blockId: "wood.obsidian.log" });

    expect(wrongTool).toMatchObject({ valid: true, accepted: true, requiredToolTag: "axe", usedCorrectTool: false, dropKind: "none", dropDefinitionId: null, dropQuantity: 0, placeableBlockItem: false });
    expect(absentTool).toMatchObject({ valid: true, accepted: true, toolTag: null, requiredToolTag: "axe", usedCorrectTool: false, dropKind: "none", dropQuantity: 0 });
    expect(isToolAwareDropConsistent(wrongTool)).toBe(true);
  });

  it("supports shears for leaves while preserving the canonical action result", () => {
    const result = evaluateToolAwareBlockDrop({ blockId: "leaves.obsidian", toolTag: "shears", state: "mature", key: "3:4:5" });

    expect(result).toMatchObject({ valid: true, accepted: true, requiredToolTag: "shears", usedCorrectTool: true, dropKind: "block-item", dropDefinitionId: "block-obsidian-leaves", dropQuantity: 1 });
  });

  it("fails closed for unknown and already-broken blocks", () => {
    const unknown = evaluateToolAwareBlockDrop({ blockId: "unknown.block", toolTag: "pickaxe" });
    const broken = evaluateToolAwareBlockDrop({ blockId: "rock.obsidian.small", toolTag: "pickaxe", state: "broken" });

    expect(unknown.valid).toBe(false);
    expect(unknown.accepted).toBe(false);
    expect(unknown.dropKind).toBe("none");
    expect(unknown.issues).toContain("unknown block definition: unknown.block");
    expect(broken.valid).toBe(false);
    expect(broken.accepted).toBe(false);
    expect(broken.dropQuantity).toBe(0);
    expect(broken.issues).toContain("block break is not accepted by the canonical resolver");
  });

  it("declares the projection read-only for inventory, world state, and durability", () => {
    const result = evaluateToolAwareBlockDrop({ blockId: "player.placed", toolTag: "pickaxe" });

    expect(result.runtimePolicy).toEqual({ inventoryMutated: false, worldStateMutated: false, durabilityMutated: false });
  });
});
