import { getItemDefinition, type ItemInstance, validateItemInstances } from "../client/src/game/data/catalog";

export type SyncInspection = {
  accepted: boolean;
  issues: string[];
  inventory: ItemInstance[];
};

export function inspectSyncPayload(payload: Record<string, unknown>): SyncInspection {
  const rawInventory = payload.inventory;
  if (!Array.isArray(rawInventory)) {
    return { accepted: false, issues: ["Save payload does not contain an inventory array"], inventory: [] };
  }

  const inventory = rawInventory as ItemInstance[];
  const basicValidation = validateItemInstances(inventory);
  const issues = [...basicValidation.issues];

  for (const item of inventory) {
    const definition = getItemDefinition(item.definitionId);
    if (!definition) continue;
    if (item.provenance.type === "starter" && !item.provenance.eventId.startsWith("starter-")) {
      issues.push(`Starter provenance has an invalid event reference: ${item.instanceId}`);
    }
    if (item.provenance.type !== "starter" && !item.provenance.mapId && !item.provenance.parentEventId) {
      issues.push(`Provenance source cannot be traced for ${item.instanceId}`);
    }
  }

  return { accepted: issues.length === 0, issues, inventory };
}

export function normalizePlayerId(value: string) {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}
