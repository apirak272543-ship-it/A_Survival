import { describe, expect, it } from "vitest";
import { CODEX_ENTRIES } from "../client/src/game/systems/codexSystem";
import { applyCodexDiscovery, createCodexDiscoverySnapshot, normalizeCodexDiscoveryIds, selectDiscoveredCodexCategory } from "../client/src/game/systems/codexDiscoveryContract";

describe("codex discovery contract", () => {
  it("starts empty and never exposes undiscovered entries", () => {
    const snapshot = createCodexDiscoverySnapshot([]);
    expect(snapshot).toMatchObject({ contractVersion: "codex-discovery-contract.v1", valid: true, discoveredItemIds: [], entries: [], rejected: [], policy: { readOnly: true, persistenceWriteAllowed: false, playerUiIntegration: false, runtimeImportAllowed: false, cacheable: false } });
    expect(Object.values(snapshot.categoryCounts).every(count => count === 0)).toBe(true);
  });

  it("normalizes valid IDs in canonical CODEX_ENTRIES order", () => {
    const first = CODEX_ENTRIES[0]!;
    const second = CODEX_ENTRIES[1]!;
    const normalization = normalizeCodexDiscoveryIds([second.id, first.id]);
    expect(normalization).toEqual({ valid: true, discoveredItemIds: [first.id, second.id], rejected: [] });
    expect(createCodexDiscoverySnapshot([second.id, first.id]).entries.map(entry => entry.id)).toEqual([first.id, second.id]);
  });

  it("rejects unknown and duplicate IDs while retaining only canonical unique discoveries", () => {
    const first = CODEX_ENTRIES[0]!;
    const normalization = normalizeCodexDiscoveryIds([first.id, first.id, "future-item-999", 42]);
    expect(normalization.valid).toBe(false);
    expect(normalization.discoveredItemIds).toEqual([first.id]);
    expect(normalization.rejected).toEqual([{ value: first.id, reason: "duplicate-entry" }, { value: "future-item-999", reason: "unknown-entry" }, { value: null, reason: "unknown-entry" }]);
  });

  it("fails closed for non-array discovery input", () => {
    expect(normalizeCodexDiscoveryIds({ discovered: [] })).toEqual({ valid: false, discoveredItemIds: [], rejected: [{ value: null, reason: "input-not-array" }] });
    expect(createCodexDiscoverySnapshot(undefined).entries).toEqual([]);
  });

  it("applies only valid new discoveries and returns deterministic added IDs", () => {
    const first = CODEX_ENTRIES[0]!;
    const second = CODEX_ENTRIES[1]!;
    const transition = applyCodexDiscovery([first.id], [second.id, first.id]);
    expect(transition).toMatchObject({ valid: true, discoveredItemIds: [first.id, second.id], addedItemIds: [second.id], rejected: [] });
    expect(transition.entries.map(entry => entry.id)).toEqual([first.id, second.id]);
    const rejected = applyCodexDiscovery([first.id], [second.id, "future-item-999"]);
    expect(rejected.valid).toBe(false);
    expect(rejected.addedItemIds).toEqual([]);
    expect(rejected.discoveredItemIds).toEqual([first.id]);
  });

  it("filters only discovered entries by canonical category and rejects unknown categories", () => {
    const weapon = CODEX_ENTRIES.find(entry => entry.category === "weapons")!;
    const selected = selectDiscoveredCodexCategory([weapon.id], "weapons");
    expect(selected).toMatchObject({ accepted: true, category: "weapons", policy: { readOnly: true, persistenceWriteAllowed: false } });
    expect(selected.entries.map(entry => entry.id)).toEqual([weapon.id]);
    expect(selectDiscoveredCodexCategory([weapon.id], "future-category")).toMatchObject({ accepted: false, category: null, entries: [], reason: "unknown-category" });
    expect(selectDiscoveredCodexCategory([weapon.id, "future-item-999"], "weapons")).toMatchObject({ accepted: false, category: "weapons", entries: [], reason: "discovery-input-rejected" });
  });
});
