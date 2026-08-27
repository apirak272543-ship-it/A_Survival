import {
  STRUCTURE_BLUEPRINT_LIBRARY,
  validateStructureBlueprints,
  type StructureBlueprint,
} from "./generators/structureGenerator";

export const STRUCTURE_GENERATOR_COVERAGE_VERSION = "0.1.0" as const;
const STRUCTURE_LEVELS = ["object", "building", "compound", "settlement", "landmark"] as const;
type StructureLevel = (typeof STRUCTURE_LEVELS)[number];

type StructureGeneratorCoverageBlockerCode =
  | "empty-blueprint-library"
  | "duplicate-blueprint-id"
  | "invalid-blueprint-validation"
  | "unknown-child-reference"
  | "invalid-asset-reference"
  | "invalid-placement-bound"
  | "invalid-generation-bound";

export type StructureGeneratorCoverageBlocker = Readonly<{
  blueprintId?: string;
  code: StructureGeneratorCoverageBlockerCode;
  reason: string;
}>;

export type StructureGeneratorCoverageReport = Readonly<{
  version: typeof STRUCTURE_GENERATOR_COVERAGE_VERSION;
  source: "STRUCTURE_BLUEPRINT_LIBRARY" | "provided-blueprints";
  totalBlueprints: number;
  uniqueBlueprints: number;
  levelCounts: Readonly<Record<StructureLevel, number>>;
  assetReferenceCount: number;
  requiredChildReferenceCount: number;
  optionalChildReferenceCount: number;
  validation: Readonly<{
    valid: boolean;
    issues: readonly string[];
  }>;
  blockers: readonly StructureGeneratorCoverageBlocker[];
  status: "complete" | "blocked";
  policy: Readonly<{
    playerGeneratorUI: false;
    assetBytesGenerated: false;
    runtimeImportAllowed: false;
    persistenceWrite: false;
    outputIsAuditOnly: true;
  }>;
}>;

function emptyLevelCounts(): Record<StructureLevel, number> {
  return Object.fromEntries(STRUCTURE_LEVELS.map(level => [level, 0])) as Record<StructureLevel, number>;
}

function addBlocker(
  blockers: StructureGeneratorCoverageBlocker[],
  code: StructureGeneratorCoverageBlockerCode,
  reason: string,
  blueprintId?: string,
): void {
  blockers.push({ ...(blueprintId ? { blueprintId } : {}), code, reason });
}

/**
 * Audits the canonical structure blueprint rules without generating assets or invoking runtime placement.
 */
export function auditStructureGeneratorCoverage(
  blueprints: readonly StructureBlueprint[] = STRUCTURE_BLUEPRINT_LIBRARY,
): StructureGeneratorCoverageReport {
  const validation = validateStructureBlueprints([...blueprints]);
  const levelCounts = emptyLevelCounts();
  const blockers: StructureGeneratorCoverageBlocker[] = [];
  const ids = blueprints.map(blueprint => blueprint.id);
  const uniqueIds = new Set(ids);
  const knownIds = new Set(ids);
  let assetReferenceCount = 0;
  let requiredChildReferenceCount = 0;
  let optionalChildReferenceCount = 0;

  if (blueprints.length === 0) addBlocker(blockers, "empty-blueprint-library", "structure generator ต้องมี blueprint อย่างน้อยหนึ่งรายการ");
  for (const duplicateId of ids.filter((id, index) => ids.indexOf(id) !== index)) {
    addBlocker(blockers, "duplicate-blueprint-id", "blueprint id ซ้ำ จึงอ้างอิง placement/generation rule แบบ deterministic ไม่ได้", duplicateId);
  }

  for (const blueprint of blueprints) {
    levelCounts[blueprint.level] += 1;
    assetReferenceCount += blueprint.assetRefs.length;
    requiredChildReferenceCount += blueprint.generation.requiredChildren.length;
    optionalChildReferenceCount += blueprint.generation.optionalChildren.length;

    for (const childId of [...blueprint.generation.requiredChildren, ...blueprint.generation.optionalChildren]) {
      if (!knownIds.has(childId)) {
        addBlocker(blockers, "unknown-child-reference", `child reference ${childId} ไม่มี blueprint เจ้าของใน library`, blueprint.id);
      }
    }

    for (const asset of blueprint.assetRefs) {
      if (!asset.assetId || !asset.kind || !asset.source || (asset.source === "reference-only" && !asset.provenanceRef)) {
        addBlocker(blockers, "invalid-asset-reference", "asset reference ต้องมี assetId/kind/source และ reference-only ต้องมี provenanceRef", blueprint.id);
      }
    }

    const placement = blueprint.placement;
    if (blueprint.footprint.width < 1 || blueprint.footprint.length < 1 || blueprint.footprint.height < 1
      || placement.maxSlopeDegrees < 0 || placement.maxSlopeDegrees > 90
      || placement.maxWaterDepth < 0 || placement.minSupportRatio < 0 || placement.minSupportRatio > 1
      || placement.minFreeSpaceWidth < blueprint.footprint.width
      || placement.minFreeSpaceLength < blueprint.footprint.length) {
      addBlocker(blockers, "invalid-placement-bound", "footprint/สโลป/น้ำ/support/free-space ต้องอยู่ในขอบเขตของ placement rule", blueprint.id);
    }

    const spawnRanges = [...blueprint.generation.npcSpawns, ...blueprint.generation.mobSpawns];
    if (spawnRanges.some(spawn => !spawn.id || !Number.isInteger(spawn.min) || !Number.isInteger(spawn.max) || spawn.min < 0 || spawn.max < spawn.min)) {
      addBlocker(blockers, "invalid-generation-bound", "npc/mob spawn range ต้องเป็นจำนวนเต็มที่ไม่ติดลบและ max >= min", blueprint.id);
    }
  }

  for (const issue of validation.issues) addBlocker(blockers, "invalid-blueprint-validation", issue);
  blockers.sort((left, right) => (left.blueprintId ?? "").localeCompare(right.blueprintId ?? "") || left.code.localeCompare(right.code) || left.reason.localeCompare(right.reason));

  return Object.freeze({
    version: STRUCTURE_GENERATOR_COVERAGE_VERSION,
    source: blueprints === STRUCTURE_BLUEPRINT_LIBRARY ? "STRUCTURE_BLUEPRINT_LIBRARY" : "provided-blueprints",
    totalBlueprints: blueprints.length,
    uniqueBlueprints: uniqueIds.size,
    levelCounts: Object.freeze(levelCounts),
    assetReferenceCount,
    requiredChildReferenceCount,
    optionalChildReferenceCount,
    validation: Object.freeze({ valid: validation.valid, issues: Object.freeze([...validation.issues]) }),
    blockers: Object.freeze(blockers),
    status: blockers.length === 0 ? "complete" : "blocked",
    policy: Object.freeze({
      playerGeneratorUI: false as const,
      assetBytesGenerated: false as const,
      runtimeImportAllowed: false as const,
      persistenceWrite: false as const,
      outputIsAuditOnly: true as const,
    }),
  });
}
