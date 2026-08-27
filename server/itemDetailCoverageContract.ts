import { ALL_ITEMS, type ItemDefinition } from "../client/src/game/data/catalog";
import {
  getItemCategoryDetail,
  type ItemCategoryDetail,
  type ItemDetailFact,
} from "../client/src/game/systems/itemDetailSystem";

export const ITEM_DETAIL_COVERAGE_VERSION = "0.1.0" as const;

const DETAIL_CATEGORIES = ["weapon", "tool", "plant", "block", "material", "structure", "other"] as const;
type DetailCategory = (typeof DETAIL_CATEGORIES)[number];

type ItemDetailCoverageBlockerCode =
  | "duplicate-definition-id"
  | "missing-usage-fact"
  | "invalid-stack-limit"
  | "weapon-attack-damage-unavailable"
  | "missing-plant-soil"
  | "missing-plant-effect"
  | "missing-block-placement"
  | "missing-tool-tag";

export type ItemDetailCoverageBlocker = Readonly<{
  definitionId: string;
  category: DetailCategory;
  code: ItemDetailCoverageBlockerCode;
  reason: string;
}>;

export type ItemDetailCoverageReport = Readonly<{
  version: typeof ITEM_DETAIL_COVERAGE_VERSION;
  source: "ALL_ITEMS" | "provided-definitions";
  totalDefinitions: number;
  categoryCounts: Readonly<Record<DetailCategory, number>>;
  definitionsWithCompleteFacts: number;
  unavailableFactCounts: Readonly<Record<string, number>>;
  blockers: readonly ItemDetailCoverageBlocker[];
  status: "complete" | "blocked";
  policy: Readonly<{
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    persistenceWrite: false;
  }>;
}>;

const categoryCounts = (): Record<DetailCategory, number> => Object.fromEntries(
  DETAIL_CATEGORIES.map(category => [category, 0]),
) as Record<DetailCategory, number>;

function findFact(detail: ItemCategoryDetail, key: ItemDetailFact["key"]): ItemDetailFact | undefined {
  return detail.facts.find(candidate => candidate.key === key);
}

function addBlocker(
  blockers: ItemDetailCoverageBlocker[],
  definition: ItemDefinition,
  category: DetailCategory,
  code: ItemDetailCoverageBlockerCode,
  reason: string,
): void {
  blockers.push({ definitionId: definition.id, category, code, reason });
}

/**
 * Audits canonical item-detail projections without mutating definitions or adding UI/runtime behavior.
 * An unavailable source-owned fact is retained as an explicit blocker instead of being fabricated.
 */
export function auditItemDetailCoverage(
  definitions: readonly ItemDefinition[] = ALL_ITEMS,
): ItemDetailCoverageReport {
  const counts = categoryCounts();
  const unavailableFactCounts: Record<string, number> = {};
  const blockers: ItemDetailCoverageBlocker[] = [];
  const seenDefinitionIds = new Set<string>();

  for (const definition of definitions) {
    const detail = getItemCategoryDetail(definition);
    const category = detail.category;
    counts[category] += 1;

    if (seenDefinitionIds.has(definition.id)) {
      addBlocker(blockers, definition, category, "duplicate-definition-id", "definition id ซ้ำใน catalog จึงอ้างอิง detail แบบ canonical ไม่ได้");
    }
    seenDefinitionIds.add(definition.id);

    const usageFact = findFact(detail, "usage");
    if (!usageFact?.available || usageFact.value.trim().length === 0) {
      addBlocker(blockers, definition, category, "missing-usage-fact", "item definition ไม่มี usage fact ที่อ่านได้จาก effect ของ source");
    }

    const stackFact = findFact(detail, "stack-limit");
    if (!stackFact?.available || !Number.isFinite(definition.stackLimit) || definition.stackLimit < 1) {
      addBlocker(blockers, definition, category, "invalid-stack-limit", "item definition ไม่มี stack limit ที่เป็นจำนวนบวกและตรวจได้");
    }

    if (category === "weapon") {
      const damageFact = findFact(detail, "attack-damage");
      if (!damageFact || damageFact.available || !detail.unavailable.includes("attack-damage")) {
        addBlocker(blockers, definition, category, "weapon-attack-damage-unavailable", "ยังไม่มี field เจ้าของค่าความเสียหาย จึงต้องแสดง attack damage เป็น unavailable อย่าง explicit");
      } else {
        unavailableFactCounts["attack-damage"] = (unavailableFactCounts["attack-damage"] ?? 0) + 1;
      }
    }

    if (category === "plant") {
      const soilFact = findFact(detail, "plant-soil");
      if (!soilFact?.available || !definition.soilId) {
        addBlocker(blockers, definition, category, "missing-plant-soil", "seed definition ไม่มี soilId ที่ยืนยันได้");
      }
      const effectFact = findFact(detail, "plant-effect");
      if (!effectFact?.available || effectFact.value.trim().length === 0) {
        addBlocker(blockers, definition, category, "missing-plant-effect", "seed definition ไม่มี plant effect ที่อ่านได้จาก source");
      }
    }

    if (category === "block") {
      const placementFact = findFact(detail, "placeable-block");
      if (!placementFact?.available || placementFact.value !== definition.placementBlockId) {
        addBlocker(blockers, definition, category, "missing-block-placement", "block item ไม่มี placementBlockId ที่ตรงกับ item detail fact");
      }
    }

    if (category === "tool") {
      const toolFact = findFact(detail, "tool-tag");
      if (!toolFact?.available || toolFact.value !== definition.toolTag) {
        addBlocker(blockers, definition, category, "missing-tool-tag", "tool definition ไม่มี toolTag ที่ตรงกับ item detail fact");
      }
    }
  }

  blockers.sort((left, right) => left.definitionId.localeCompare(right.definitionId) || left.code.localeCompare(right.code));
  const blockedDefinitionIds = new Set(blockers.map(blocker => blocker.definitionId));

  return Object.freeze({
    version: ITEM_DETAIL_COVERAGE_VERSION,
    source: definitions === ALL_ITEMS ? "ALL_ITEMS" : "provided-definitions",
    totalDefinitions: definitions.length,
    categoryCounts: Object.freeze(counts),
    definitionsWithCompleteFacts: definitions.length - blockedDefinitionIds.size,
    unavailableFactCounts: Object.freeze(unavailableFactCounts),
    blockers: Object.freeze(blockers),
    status: blockers.length === 0 ? "complete" : "blocked",
    policy: Object.freeze({
      runtimeImportAllowed: false as const,
      playerVisible: false as const,
      cacheable: false as const,
      persistenceWrite: false as const,
    }),
  });
}
