import { describe, expect, it } from "vitest";
import { isSafeUseItemPayload } from "./syncActionValidation";

describe("use-item sync boundary", () => {
  it("accepts a bounded slot and well-formed item identifiers", () => {
    expect(isSafeUseItemPayload({ slot: 0, instanceId: "inst-seed-001-2", definitionId: "seed-001" })).toBe(true);
    expect(isSafeUseItemPayload({ slot: 5, instanceId: "profile-12-starter-1", definitionId: "structure-001" })).toBe(true);
  });

  it("rejects out-of-range slots and malformed identifiers", () => {
    expect(isSafeUseItemPayload({ slot: -1, instanceId: "inst-seed-001-2", definitionId: "seed-001" })).toBe(false);
    expect(isSafeUseItemPayload({ slot: 6, instanceId: "inst-seed-001-2", definitionId: "seed-001" })).toBe(false);
    expect(isSafeUseItemPayload({ slot: 0, instanceId: "inst seed", definitionId: "seed-001" })).toBe(false);
    expect(isSafeUseItemPayload({ slot: 0, instanceId: "inst-seed-001-2", definitionId: "unknown-001" })).toBe(false);
  });
});
