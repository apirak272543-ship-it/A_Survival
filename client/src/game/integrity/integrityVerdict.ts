import { TIER_RULES, getItemDefinition, type ItemInstance } from "@/game/data/catalog";

export type IntegritySeverity = "none" | "low" | "medium" | "high";
export type IntegrityCode = "clock-drift-suspect" | "provenance-mismatch" | "duplicate-instance-id" | "invalid-item-shape";

export type IntegrityFinding = {
  code: IntegrityCode;
  severity: IntegritySeverity;
  instanceId?: string;
  message: string;
};

export type IntegrityReport = {
  status: "clear" | "attention";
  findings: IntegrityFinding[];
  quarantinedInstanceIds: string[];
  validInstanceCount: number;
  canContinue: true;
};

const quarantineCodes = new Set<IntegrityCode>(["provenance-mismatch", "duplicate-instance-id", "invalid-item-shape"]);

function finding(code: IntegrityCode, severity: IntegritySeverity, instanceId: string | undefined, message: string): IntegrityFinding {
  return { code, severity, instanceId, message };
}

/**
 * A client-side guardrail for accidental save corruption and casual tampering.
 * It deliberately never claims to be authoritative anti-cheat: server sync remains
 * the source of truth once a player is online.
 */
export function inspectInventoryIntegrity(inventory: ItemInstance[]): IntegrityReport {
  const findings: IntegrityFinding[] = [];
  const counts = new Map<string, number>();
  for (const item of inventory) counts.set(item.instanceId, (counts.get(item.instanceId) ?? 0) + 1);

  for (const item of inventory) {
    const definition = getItemDefinition(item.definitionId);
    if (!definition) {
      findings.push(finding("invalid-item-shape", "high", item.instanceId, "ไม่พบข้อมูลต้นแบบของไอเทมชิ้นนี้"));
      continue;
    }
    if ((counts.get(item.instanceId) ?? 0) > 1) {
      findings.push(finding("duplicate-instance-id", "high", item.instanceId, "พบรหัส instance ซ้ำ จึงพักการใช้งานรายการนี้ไว้ก่อน"));
    }
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > definition.stackLimit || (definition.equippable && item.quantity !== 1)) {
      findings.push(finding("invalid-item-shape", "high", item.instanceId, "จำนวนไอเทมไม่ตรงกับกติกาของ item instance"));
    }
    if (!Number.isInteger(item.enhancement) || item.enhancement < 0 || item.enhancement > TIER_RULES[definition.tier].enhancementCap) {
      findings.push(finding("invalid-item-shape", "high", item.instanceId, "ระดับ enhancement ไม่อยู่ในขอบเขตของ tier"));
    }
    const provenance = item.provenance;
    if (!provenance?.eventId || !provenance.integrityHash || !provenance.type) {
      findings.push(finding("provenance-mismatch", "medium", item.instanceId, "ไอเทมนี้ไม่มีประวัติแหล่งที่มาครบถ้วน"));
      continue;
    }
    if (provenance.type === "starter" && !provenance.eventId.startsWith("starter-")) {
      findings.push(finding("provenance-mismatch", "medium", item.instanceId, "ประวัติ starter item ไม่ตรงกับรูปแบบที่ยืนยันได้"));
    }
    if (provenance.type !== "starter" && !provenance.mapId && !provenance.parentEventId) {
      findings.push(finding("provenance-mismatch", "medium", item.instanceId, "ประวัติไอเทมนี้ไม่เชื่อมกับ map หรือ event ต้นทาง"));
    }
  }

  const quarantinedInstanceIds = Array.from(new Set(findings.filter(item => item.instanceId && quarantineCodes.has(item.code)).map(item => item.instanceId!)));
  return {
    status: findings.length === 0 ? "clear" : "attention",
    findings,
    quarantinedInstanceIds,
    validInstanceCount: inventory.filter(item => !quarantinedInstanceIds.includes(item.instanceId)).length,
    canContinue: true,
  };
}

export function integrityStatusCopy(report: IntegrityReport) {
  if (report.status === "clear") return "Loadout integrity · พร้อมใช้งาน";
  return `พบ ${report.quarantinedInstanceIds.length} item instance ที่รอตรวจสอบ · รายการอื่นยังใช้งานได้`;
}
