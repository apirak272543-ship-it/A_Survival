import { getItemDefinition, type ItemInstance } from "@/game/data/catalog";

export type VaultAction = "equip" | "use" | "trade" | "dismantle";
export type VaultEquipment = Partial<Record<"sword" | "bow" | "ranged", string>>;

export function getVaultActionState(instance: ItemInstance | undefined, quarantinedInstanceIds: Set<string>, action: VaultAction) {
  if (!instance) return { allowed: false, reason: "ยังไม่ได้เลือก item instance" };
  if (quarantinedInstanceIds.has(instance.instanceId)) return { allowed: false, reason: "item instance นี้รอการยืนยันข้อมูล จึงถูกจำกัดการใช้งานชั่วคราว" };
  const definition = getItemDefinition(instance.definitionId);
  if (!definition) return { allowed: false, reason: "ไม่พบข้อมูลนิยามของไอเทมนี้" };
  if (action === "equip" && !definition.equippable) return { allowed: false, reason: "ไอเทมนี้ไม่อยู่ในช่องสวมใส่" };
  if (action === "use") return { allowed: false, reason: "ไอเทมนี้ยังไม่มีผลใช้ในสนามของต้นแบบ" };
  if (action === "trade") return { allowed: false, reason: "ระบบแลกเปลี่ยนยังไม่เปิดใช้งานในเวอร์ชันทดสอบแบบออฟไลน์" };
  if (action === "dismantle") return { allowed: false, reason: "ระบบย่อยสลายไอเทมอยู่ระหว่างการพัฒนา" };
  return { allowed: true as const, reason: undefined };
}

export function toggleVaultEquipment(equipment: VaultEquipment, instance: ItemInstance, quarantinedInstanceIds: Set<string>): VaultEquipment {
  const definition = getItemDefinition(instance.definitionId);
  const state = getVaultActionState(instance, quarantinedInstanceIds, "equip");
  if (!definition?.equippable || !state.allowed || !["sword", "bow", "ranged"].includes(definition.category)) return equipment;
  const slot = definition.category as keyof VaultEquipment;
  return equipment[slot] === instance.instanceId ? { ...equipment, [slot]: undefined } : { ...equipment, [slot]: instance.instanceId };
}
