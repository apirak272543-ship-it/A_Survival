import { getItemDefinition, type ItemInstance, validateItemInstances } from "../client/src/game/data/catalog";

export type SyncInspection = {
  accepted: boolean;
  issues: string[];
  inventory: ItemInstance[];
  safeInventory: ItemInstance[];
  quarantinedInstanceIds: string[];
};

export function inspectSyncPayload(payload: Record<string, unknown>): SyncInspection {
  const rawInventory = payload.inventory;
  if (!Array.isArray(rawInventory)) {
    return { accepted: false, issues: ["Save payload does not contain an inventory array"], inventory: [], safeInventory: [], quarantinedInstanceIds: [] };
  }

  const inventory = rawInventory as ItemInstance[];
  const basicValidation = validateItemInstances(inventory);
  const issues = [...basicValidation.issues];
  const quarantinedInstanceIds = new Set<string>();

  for (const issue of basicValidation.issues) {
    const instanceId = inventory.find(item => issue.includes(item.instanceId))?.instanceId;
    if (instanceId) quarantinedInstanceIds.add(instanceId);
  }

  const occurrenceCount = new Map<string, number>();
  for (const item of inventory) occurrenceCount.set(item.instanceId, (occurrenceCount.get(item.instanceId) ?? 0) + 1);
  for (const [instanceId, count] of Array.from(occurrenceCount.entries())) if (count > 1) quarantinedInstanceIds.add(instanceId);

  for (const item of inventory) {
    const definition = getItemDefinition(item.definitionId);
    if (!definition) {
      quarantinedInstanceIds.add(item.instanceId);
      continue;
    }
    if (item.provenance.type === "starter" && !item.provenance.eventId.startsWith("starter-")) {
      issues.push(`Starter provenance has an invalid event reference: ${item.instanceId}`);
      quarantinedInstanceIds.add(item.instanceId);
    }
    if (item.provenance.type !== "starter" && !item.provenance.mapId && !item.provenance.parentEventId) {
      issues.push(`Provenance source cannot be traced for ${item.instanceId}`);
      quarantinedInstanceIds.add(item.instanceId);
    }
  }

  const quarantineList = Array.from(quarantinedInstanceIds);
  return {
    accepted: true,
    issues,
    inventory,
    safeInventory: inventory.filter(item => !quarantinedInstanceIds.has(item.instanceId)),
    quarantinedInstanceIds: quarantineList,
  };
}

export function normalizePlayerId(value: string) {
  return value.trim().replace(/\s+/g, "-").toLowerCase();
}
