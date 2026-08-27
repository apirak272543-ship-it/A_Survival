import { describe, expect, it } from "vitest";
import { evaluateThaiCopyPolicy, MAX_COPY_RECORDS, type ThaiCopyRecord } from "./thaiCopyPolicyContract";

const validRecords: ThaiCopyRecord[] = [
  { id: "player-start", surface: "player", defaultText: "เริ่มเลย เดี๋ยวค่อยเก็บของ", fallbackText: "เริ่มเกมก่อน แล้วค่อยกลับมาใหม่" },
  { id: "creator-save", surface: "creator", defaultText: "เซฟงานแล้วนะ", fallbackText: "ยังเซฟไม่สำเร็จ ลองใหม่อีกครั้ง" },
  { id: "admin-audit", surface: "admin", defaultText: "ตรวจสอบสิทธิ์ผู้ดูแลระบบ", fallbackText: "ไม่พบข้อมูลสิทธิ์ผู้ดูแลระบบ" },
  { id: "dev-debug", surface: "developer", defaultText: "โหมดดีบักยังไม่พร้อมใช้งาน", fallbackText: "ปิดโหมดดีบักแล้วลองใหม่" },
];

describe("Thai-first copy policy contract", () => {
  it("accepts Thai default and fallback copy across player/creator/admin surfaces", () => {
    const result = evaluateThaiCopyPolicy({ records: validRecords });

    expect(result).toMatchObject({
      contractVersion: "thai-copy-policy.v1",
      valid: true,
      issues: [],
      acceptedIds: ["admin-audit", "creator-save", "dev-debug", "player-start"],
      summary: { totalCount: 4, playerCount: 1, creatorCount: 1, developerCount: 1, adminCount: 1, thaiDefaultCount: 4, colloquialViolationCount: 0 },
    });
  });

  it("rejects formal player/creator copy and non-Thai defaults/fallbacks", () => {
    const result = evaluateThaiCopyPolicy({ records: [
      { id: "player-formal", surface: "player", defaultText: "กรุณาโปรดดำเนินการต่อ", fallbackText: "Please continue" },
      { id: "creator-empty", surface: "creator", defaultText: "", fallbackText: "" },
    ] });

    expect(result.valid).toBe(false);
    expect(result.summary.colloquialViolationCount).toBe(1);
    expect(result.issues).toEqual(expect.arrayContaining([
      "player/creator copy is too formal: player-formal",
      "fallback copy must contain Thai text: player-formal",
      "defaultText is missing: creator-empty",
      "fallbackText is missing: creator-empty",
      "default copy must contain Thai text: creator-empty",
      "fallback copy must contain Thai text: creator-empty",
    ]));
  });

  it("orders accepted IDs deterministically and rejects duplicate/invalid IDs", () => {
    const result = evaluateThaiCopyPolicy({ records: [validRecords[1]!, validRecords[0]!, { ...validRecords[0]!, id: "bad id" }] });

    expect(result.valid).toBe(false);
    expect(result.acceptedIds).toEqual(["creator-save", "player-start"]);
    expect(result.issues).toEqual(expect.arrayContaining(["copy id is invalid: bad id"]));
    const duplicate = evaluateThaiCopyPolicy({ records: [validRecords[0]!, validRecords[0]!] });
    expect(duplicate.issues).toContain("duplicate copy ID: player-start");
  });

  it("is deterministic and bounds list size", () => {
    const first = evaluateThaiCopyPolicy({ records: validRecords });
    const second = evaluateThaiCopyPolicy({ records: [...validRecords].reverse() });

    expect(second).toEqual(first);
    expect(() => evaluateThaiCopyPolicy({ records: Array.from({ length: MAX_COPY_RECORDS + 1 }, (_, index) => ({ ...validRecords[0]!, id: `copy-${index}` })) })).toThrow("copy records must contain at most 256 entries");
  });
});
