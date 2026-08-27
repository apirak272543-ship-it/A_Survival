export const THAI_COPY_POLICY_VERSION = "thai-copy-policy.v1" as const;
export const MAX_COPY_RECORDS = 256;

export type CopySurface = "player" | "creator" | "developer" | "admin";

export type ThaiCopyRecord = {
  id: string;
  surface: CopySurface;
  defaultText: string;
  fallbackText: string;
};

export type ThaiCopyPolicyResult = {
  contractVersion: typeof THAI_COPY_POLICY_VERSION;
  valid: boolean;
  issues: string[];
  acceptedIds: string[];
  summary: {
    totalCount: number;
    playerCount: number;
    creatorCount: number;
    developerCount: number;
    adminCount: number;
    thaiDefaultCount: number;
    colloquialViolationCount: number;
  };
};

const ID_PATTERN = /^[a-z0-9][a-z0-9._-]{1,63}$/;
const SURFACES: readonly CopySurface[] = ["player", "creator", "developer", "admin"];
const FORMAL_PHRASES = ["กรุณาโปรด", "เรียนท่าน", "ขอเรียน", "อนึ่ง", "ดังกล่าวข้างต้น", "จึงเรียนมาเพื่อทราบ"] as const;

function hasThai(text: string) {
  return /[\u0E00-\u0E7F]/.test(text);
}

function requiredText(value: string, field: string, id: string, issues: string[]) {
  const normalized = value.trim();
  if (!normalized) issues.push(`${field} is missing: ${id}`);
  return normalized;
}

function hasFormalPhrase(text: string) {
  return FORMAL_PHRASES.some(phrase => text.includes(phrase));
}

export function evaluateThaiCopyPolicy(input: { records: readonly ThaiCopyRecord[] }): ThaiCopyPolicyResult {
  if (input.records.length > MAX_COPY_RECORDS) throw new Error(`copy records must contain at most ${MAX_COPY_RECORDS} entries`);
  const issues: string[] = [];
  const seenIds = new Set<string>();
  const acceptedIds: string[] = [];
  let playerCount = 0;
  let creatorCount = 0;
  let developerCount = 0;
  let adminCount = 0;
  let thaiDefaultCount = 0;
  let colloquialViolationCount = 0;

  for (const record of [...input.records].sort((left, right) => left.id.localeCompare(right.id))) {
    const id = record.id.trim();
    if (!ID_PATTERN.test(id)) {
      issues.push(`copy id is invalid: ${id || "<empty>"}`);
      continue;
    }
    if (seenIds.has(id)) {
      issues.push(`duplicate copy ID: ${id}`);
      continue;
    }
    seenIds.add(id);
    const defaultText = requiredText(record.defaultText, "defaultText", id, issues);
    const fallbackText = requiredText(record.fallbackText, "fallbackText", id, issues);
    if (!SURFACES.includes(record.surface)) issues.push(`copy surface is unsupported: ${id}`);
    if (record.surface === "player") playerCount += 1;
    if (record.surface === "creator") creatorCount += 1;
    if (record.surface === "developer") developerCount += 1;
    if (record.surface === "admin") adminCount += 1;
    if (hasThai(defaultText)) thaiDefaultCount += 1;
    else issues.push(`default copy must contain Thai text: ${id}`);
    if (!hasThai(fallbackText)) issues.push(`fallback copy must contain Thai text: ${id}`);
    if ((record.surface === "player" || record.surface === "creator") && hasFormalPhrase(defaultText)) {
      colloquialViolationCount += 1;
      issues.push(`player/creator copy is too formal: ${id}`);
    }
    if (defaultText.length > 240 || fallbackText.length > 240) issues.push(`copy exceeds 240 characters: ${id}`);
    if (issues.every(issue => !issue.endsWith(`: ${id}`) && !issue.endsWith(`: ${id}`))) acceptedIds.push(id);
  }

  return {
    contractVersion: THAI_COPY_POLICY_VERSION,
    valid: issues.length === 0,
    issues,
    acceptedIds: acceptedIds.sort(),
    summary: { totalCount: input.records.length, playerCount, creatorCount, developerCount, adminCount, thaiDefaultCount, colloquialViolationCount },
  };
}
