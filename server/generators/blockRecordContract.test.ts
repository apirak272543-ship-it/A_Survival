import { describe, expect, it } from "vitest";
import { generateTreeBlocks } from "../../client/src/game/systems/blockWorldSystem";
import { validateBlockRecords, MAX_BLOCK_RECORDS } from "./blockRecordContract";

const tree = generateTreeBlocks({ x: 4, z: -2, seed: 731, state: "mature" });
const first = tree.blocks[0]!;

 describe("block record contract", () => {
  it("accepts deterministic tree records with shared group identity for trunk and leaves", () => {
    const result = validateBlockRecords(tree.blocks);

    expect(result.valid).toBe(true);
    expect(result.issues).toEqual([]);
    expect(result.summary.blockCount).toBe(tree.blocks.length);
    expect(result.summary.groupCount).toBe(1);
    expect(result.summary.groupedBlockCount).toBe(tree.blocks.length);
    expect(result.summary.kindCounts.log).toBeGreaterThan(0);
    expect(result.summary.kindCounts.leaf).toBeGreaterThan(0);
    expect(result.summary.stateCounts.mature).toBe(tree.blocks.length);
    expect(result.records.map(record => record.key)).toEqual([...result.records].map(record => record.key).sort());
  });

  it("rejects coordinate, definition, state, hit-point and group contract violations", () => {
    const invalid = [
      { ...first, key: "not-a-coordinate" },
      { ...first, key: first.key, x: first.x + 1 },
      { ...first, key: `${first.key}-duplicate`, blockId: "missing.block" },
      { ...first, key: `${first.key}-bad-state`, state: "unknown" as never },
      { ...first, key: `${first.key}-bad-hp`, hitPoints: first.maxHitPoints + 1 },
      { ...first, key: `${first.key}-bad-solid`, solid: !first.solid },
      { ...first, key: `${first.key}-bad-group`, groupId: "" },
    ];

    const result = validateBlockRecords(invalid);
    const codes = result.issues.map(issue => issue.code);

    expect(result.valid).toBe(false);
    expect(codes).toContain("KEY_MISMATCH");
    expect(codes).toContain("DUPLICATE_COORDINATE");
    expect(codes).toContain("UNKNOWN_BLOCK");
    expect(codes).toContain("INVALID_STATE");
    expect(codes).toContain("HIT_POINT_CONTRACT");
    expect(codes).toContain("SOLIDITY_MISMATCH");
    expect(codes).toContain("INVALID_GROUP");
  });

  it("rejects oversized record batches before processing", () => {
    const result = validateBlockRecords(Array.from({ length: MAX_BLOCK_RECORDS + 1 }, () => first));

    expect(result.valid).toBe(false);
    expect(result.issues).toEqual([{ code: "TOO_MANY_RECORDS", message: `block record count must be at most ${MAX_BLOCK_RECORDS}` }]);
    expect(result.records).toEqual([]);
    expect(result.summary.blockCount).toBe(0);
  });
});
