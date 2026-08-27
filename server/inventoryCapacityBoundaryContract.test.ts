import { describe, expect, it } from "vitest";
import { createMapRewardInstance, type ItemInstance } from "../client/src/game/data/catalog";
import { PLAYER_INVENTORY_SLOTS, WORLD_STORAGE_DEFAULT_SLOTS } from "../client/src/game/systems/inventorySystem";
import { evaluateInventoryCapacityBoundary } from "./inventoryCapacityBoundaryContract";

function item(definitionId: string, sequence: number, quantity: number): ItemInstance {
  return createMapRewardInstance(definitionId, sequence, "obsidian-frontier", `capacity-${sequence}`, "drop", quantity);
}

describe("inventory capacity boundary contract", () => {
  it("uses canonical 40-slot carry capacity and leaves input container unchanged", () => {
    const carry = Array.from({ length: PLAYER_INVENTORY_SLOTS - 1 }, (_, index) => item(`material-${String((index % 3) + 1).padStart(3, "0")}`, index + 1, 1));
    const incoming = item("material-001", 100, 2);
    const before = carry.map(entry => ({ ...entry }));
    const result = evaluateInventoryCapacityBoundary({ kind: "carry", container: carry, incoming });

    expect(result.valid).toBe(true);
    expect(result.capacity).toBe(40);
    expect(result.afterSlotCount).toBeLessThanOrEqual(40);
    expect(result.runtimePolicy).toEqual({ inputContainerUnchanged: true, crossMapCarryMutationPerformed: false, persistenceWritePerformed: false });
    expect(carry).toEqual(before);
  });

  it("uses canonical 27-slot world-storage capacity and preserves normal 64-item stack merge", () => {
    const chest = [item("block-obsidian-ash", 1, 60)];
    const result = evaluateInventoryCapacityBoundary({ kind: "world-storage", container: chest, incoming: item("block-obsidian-ash", 2, 8) });

    expect(result.valid).toBe(true);
    expect(result.capacity).toBe(WORLD_STORAGE_DEFAULT_SLOTS);
    expect(result.stackLimit).toBe(64);
    expect(result.addedQuantity).toBe(8);
    expect(result.remainderQuantity).toBe(0);
    expect(result.transfer.inventory[0]).toMatchObject({ definitionId: "block-obsidian-ash", quantity: 64 });
    expect(result.transfer.inventory).toHaveLength(2);
  });

  it("reports overflow instead of exceeding the carry cap", () => {
    const carry = Array.from({ length: PLAYER_INVENTORY_SLOTS }, (_, index) => item("material-001", index + 1, 1));
    const result = evaluateInventoryCapacityBoundary({ kind: "carry", container: carry, incoming: item("material-002", 100, 3) });

    expect(result.valid).toBe(true);
    expect(result.afterSlotCount).toBe(PLAYER_INVENTORY_SLOTS);
    expect(result.addedQuantity).toBe(0);
    expect(result.remainderQuantity).toBe(3);
    expect(result.transfer.accepted).toBe(false);
  });

  it("rejects non-canonical capacity requests or unknown definitions without persistence mutation", () => {
    const unknown = { ...item("material-001", 1, 1), definitionId: "unknown-item" };
    const result = evaluateInventoryCapacityBoundary({ kind: "carry", container: [], incoming: unknown, requestedCapacity: 99 });

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual(expect.arrayContaining(["carry capacity must remain 40", "incoming item definition is unavailable"]));
    expect(result.stackLimit).toBeNull();
    expect(result.runtimePolicy.persistenceWritePerformed).toBe(false);
  });
});
