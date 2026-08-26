export type UseItemSyncPayload = {
  slot: number;
  instanceId: string;
  definitionId: string;
};

const DEFINITION_ID_PATTERN = /^(sword|bow|ranged|seed|material|furniture|decoration|structure)-\d{3}$/;
const INSTANCE_ID_PATTERN = /^[A-Za-z0-9._:-]{1,128}$/;

export function isSafeUseItemPayload(payload: Record<string, unknown>): payload is UseItemSyncPayload {
  return Number.isInteger(payload.slot)
    && Number(payload.slot) >= 0
    && Number(payload.slot) <= 5
    && typeof payload.instanceId === "string"
    && INSTANCE_ID_PATTERN.test(payload.instanceId)
    && typeof payload.definitionId === "string"
    && DEFINITION_ID_PATTERN.test(payload.definitionId);
}
