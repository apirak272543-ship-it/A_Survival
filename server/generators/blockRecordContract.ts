import { blockKey, getBlockDefinition, type BlockState, type WorldBlock } from "../../client/src/game/data/blockModules";

export const MAX_BLOCK_RECORDS = 4_096;

const BLOCK_STATES = new Set<BlockState>(["intact", "damaged", "sapling", "young", "mature", "decaying", "broken"]);

type BlockRecordIssueCode =
  | "TOO_MANY_RECORDS"
  | "INVALID_COORDINATE"
  | "KEY_MISMATCH"
  | "DUPLICATE_COORDINATE"
  | "UNKNOWN_BLOCK"
  | "INVALID_MODULE"
  | "INVALID_STATE"
  | "INVALID_SEED"
  | "HIT_POINT_CONTRACT"
  | "SOLIDITY_MISMATCH"
  | "INVALID_GROUP";

export type BlockRecordContractIssue = {
  code: BlockRecordIssueCode;
  recordKey?: string;
  message: string;
};

export type BlockRecordContractSummary = {
  blockCount: number;
  groupedBlockCount: number;
  groupCount: number;
  stateCounts: Record<BlockState, number>;
  actionCounts: Record<"break" | "chop" | "harvest", number>;
  kindCounts: Record<string, number>;
};

export type BlockRecordContractResult = {
  valid: boolean;
  records: WorldBlock[];
  issues: BlockRecordContractIssue[];
  summary: BlockRecordContractSummary;
};

function emptyStateCounts(): Record<BlockState, number> {
  return { intact: 0, damaged: 0, sapling: 0, young: 0, mature: 0, decaying: 0, broken: 0 };
}

function emptySummary(): BlockRecordContractSummary {
  return {
    blockCount: 0,
    groupedBlockCount: 0,
    groupCount: 0,
    stateCounts: emptyStateCounts(),
    actionCounts: { break: 0, chop: 0, harvest: 0 },
    kindCounts: {},
  };
}

function finiteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function validateBlockRecords(records: readonly WorldBlock[]): BlockRecordContractResult {
  if (records.length > MAX_BLOCK_RECORDS) {
    return {
      valid: false,
      records: [],
      issues: [{ code: "TOO_MANY_RECORDS", message: `block record count must be at most ${MAX_BLOCK_RECORDS}` }],
      summary: emptySummary(),
    };
  }

  const issues: BlockRecordContractIssue[] = [];
  const coordinates = new Set<string>();
  const groups = new Set<string>();
  const groupModules = new Map<string, string>();
  const normalizedRecords = [...records].sort((left, right) => left.key.localeCompare(right.key));
  const summary = emptySummary();

  for (const record of normalizedRecords) {
    const recordKey = typeof record.key === "string" ? record.key : undefined;
    const hasValidCoordinates = [record.x, record.y, record.z].every(finiteInteger);
    if (!hasValidCoordinates) {
      issues.push({ code: "INVALID_COORDINATE", recordKey, message: "block coordinates must be finite integers" });
      continue;
    }

    const expectedKey = blockKey(record.x, record.y, record.z);
    if (record.key !== expectedKey) {
      issues.push({ code: "KEY_MISMATCH", recordKey, message: `block key must equal ${expectedKey}` });
    }
    if (coordinates.has(expectedKey)) {
      issues.push({ code: "DUPLICATE_COORDINATE", recordKey, message: `duplicate block coordinate ${expectedKey}` });
    }
    coordinates.add(expectedKey);

    const definition = getBlockDefinition(record.blockId);
    if (!definition) {
      issues.push({ code: "UNKNOWN_BLOCK", recordKey, message: `unknown block definition ${record.blockId}` });
      continue;
    }
    if (!nonEmptyString(record.moduleId)) {
      issues.push({ code: "INVALID_MODULE", recordKey, message: "block moduleId must be a non-empty string" });
    }
    if (!BLOCK_STATES.has(record.state)) {
      issues.push({ code: "INVALID_STATE", recordKey, message: `unsupported block state ${String(record.state)}` });
    }
    if (!finiteInteger(record.seed)) {
      issues.push({ code: "INVALID_SEED", recordKey, message: "block seed must be a finite integer" });
    }

    const expectedHitPoints = Math.max(1, definition.hardness);
    if (!Number.isFinite(record.maxHitPoints) || record.maxHitPoints !== expectedHitPoints || !Number.isFinite(record.hitPoints) || record.hitPoints < 0 || record.hitPoints > record.maxHitPoints) {
      issues.push({ code: "HIT_POINT_CONTRACT", recordKey, message: `hit points must be within 0..${expectedHitPoints}` });
    }
    if (record.solid !== definition.solid) {
      issues.push({ code: "SOLIDITY_MISMATCH", recordKey, message: `solid flag must match block definition ${record.blockId}` });
    }

    if (record.groupId !== undefined) {
      if (!nonEmptyString(record.groupId)) {
        issues.push({ code: "INVALID_GROUP", recordKey, message: "groupId must be a non-empty string when present" });
      } else {
        groups.add(record.groupId);
        const previousModule = groupModules.get(record.groupId);
        if (previousModule && previousModule !== record.moduleId) {
          issues.push({ code: "INVALID_GROUP", recordKey, message: `group ${record.groupId} mixes module IDs` });
        }
        groupModules.set(record.groupId, record.moduleId);
        summary.groupedBlockCount += 1;
      }
    }

    summary.blockCount += 1;
    summary.stateCounts[record.state] = (summary.stateCounts[record.state] ?? 0) + 1;
    summary.actionCounts[definition.action] += 1;
    summary.kindCounts[definition.kind] = (summary.kindCounts[definition.kind] ?? 0) + 1;
  }

  summary.groupCount = groups.size;
  return { valid: issues.length === 0, records: normalizedRecords, issues, summary };
}
