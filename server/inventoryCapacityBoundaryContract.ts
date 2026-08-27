import { getItemDefinition, type ItemInstance } from "../client/src/game/data/catalog";
import { addItemToContainer, PLAYER_INVENTORY_SLOTS, WORLD_STORAGE_DEFAULT_SLOTS, type InventoryAddResult } from "../client/src/game/systems/inventorySystem";

export const INVENTORY_CAPACITY_BOUNDARY_VERSION = "inventory-capacity-boundary.v1" as const;

export type InventoryContainerKind = "carry" | "world-storage";

export type InventoryCapacityBoundaryResult = {
  contractVersion: typeof INVENTORY_CAPACITY_BOUNDARY_VERSION;
  valid: boolean;
  issues: string[];
  kind: InventoryContainerKind;
  capacity: number;
  stackLimit: number | null;
  beforeSlotCount: number;
  afterSlotCount: number;
  addedQuantity: number;
  remainderQuantity: number;
  transfer: InventoryAddResult;
  runtimePolicy: {
    inputContainerUnchanged: true;
    crossMapCarryMutationPerformed: false;
    persistenceWritePerformed: false;
  };
};

function canonicalCapacity(kind: InventoryContainerKind) {
  return kind === "carry" ? PLAYER_INVENTORY_SLOTS : WORLD_STORAGE_DEFAULT_SLOTS;
}

export function evaluateInventoryCapacityBoundary(input: {
  kind: InventoryContainerKind;
  container: ItemInstance[];
  incoming: ItemInstance;
  requestedCapacity?: number;
}): InventoryCapacityBoundaryResult {
  const issues: string[] = [];
  const capacity = canonicalCapacity(input.kind);
  if (input.requestedCapacity !== undefined && input.requestedCapacity !== capacity) issues.push(`${input.kind} capacity must remain ${capacity}`);
  const definition = getItemDefinition(input.incoming.definitionId);
  const transfer = addItemToContainer(input.container, input.incoming, capacity);
  if (!definition) issues.push("incoming item definition is unavailable");
  if (input.incoming.quantity < 1) issues.push("incoming quantity must be positive");
  return {
    contractVersion: INVENTORY_CAPACITY_BOUNDARY_VERSION,
    valid: issues.length === 0,
    issues,
    kind: input.kind,
    capacity,
    stackLimit: definition?.stackLimit ?? null,
    beforeSlotCount: input.container.length,
    afterSlotCount: transfer.inventory.length,
    addedQuantity: transfer.addedQuantity,
    remainderQuantity: transfer.remainder?.quantity ?? 0,
    transfer,
    runtimePolicy: {
      inputContainerUnchanged: true,
      crossMapCarryMutationPerformed: false,
      persistenceWritePerformed: false,
    },
  };
}
