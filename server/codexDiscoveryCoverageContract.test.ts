import { describe, expect, it } from "vitest";
import { CODEX_ENTRIES } from "../client/src/game/systems/codexSystem";
import { buildCodexDiscoveryCoverageReport } from "./codexDiscoveryCoverageContract";

describe("Codex discovery coverage contract", () => {
  it("audits canonical categories and returns an empty state without discovered IDs", () => {
    const report = buildCodexDiscoveryCoverageReport();

    expect(report).toMatchObject({
      schemaVersion: "a-survival.codex-discovery-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      catalogEntryCount: CODEX_ENTRIES.length,
      discoveredInputCount: 0,
      discoveredUniqueKnownCount: 0,
      unknownDiscoveredIdCount: 0,
      duplicateDiscoveredIdCount: 0,
      undiscoveredEntryLeakCount: 0,
      emptyState: true,
      issues: [],
    });
    expect(report.categories).toHaveLength(8);
    expect(report.categories.filter(category => category.catalogEntryCount > 0).length).toBeGreaterThan(0);
    expect(report.categories.find(category => category.id === "companions")?.catalogEntryCount).toBe(0);
    expect(report.categories.find(category => category.id === "creatures")?.catalogEntryCount).toBe(0);
    expect(report.categories.every(category => category.discoveredEntryCount === 0)).toBe(true);
    expect(report.subcategories.seed).toBeGreaterThan(0);
    expect(report.subcategories.resource).toBeGreaterThan(0);
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("projects only discovered canonical entries and keeps categories/subcategories consistent", () => {
    const discovered = [CODEX_ENTRIES[0]!.id, CODEX_ENTRIES[1]!.id, CODEX_ENTRIES[0]!.id];
    const report = buildCodexDiscoveryCoverageReport({ discoveredItemIds: discovered });

    expect(report.valid).toBe(false);
    expect(report.discoveredInputCount).toBe(3);
    expect(report.discoveredUniqueKnownCount).toBe(2);
    expect(report.duplicateDiscoveredIdCount).toBe(1);
    expect(report.emptyState).toBe(false);
    expect(report.discoveredEntries.map(entry => entry.id)).toEqual([CODEX_ENTRIES[0]!.id, CODEX_ENTRIES[1]!.id]);
    expect(report.discoveredEntries.every(entry => discovered.includes(entry.id))).toBe(true);
    expect(report.categories.reduce((total, category) => total + category.discoveredEntryCount, 0)).toBe(2);
    expect(Object.values(report.discoveredSubcategories).reduce((total, count) => total + count, 0)).toBe(2);
  });

  it("fails closed for unknown and malformed discoveries and bounds the input", () => {
    const report = buildCodexDiscoveryCoverageReport({ discoveredItemIds: [CODEX_ENTRIES[0]!.id, "not-in-codex", null, ...Array.from({ length: 513 }, () => CODEX_ENTRIES[1]!.id)] });

    expect(report.valid).toBe(false);
    expect(report.discoveredInputCount).toBe(516);
    expect(report.discoveredUniqueKnownCount).toBe(2);
    expect(report.unknownDiscoveredIdCount).toBe(1);
    expect(report.duplicateDiscoveredIdCount).toBeGreaterThan(0);
    expect(report.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(["DISCOVERED_IDS_TRUNCATED", "DISCOVERED_ID_INVALID", "UNKNOWN_DISCOVERED_ID", "DUPLICATE_DISCOVERED_ID"]));
  });

  it("does not write discovery state, expose undiscovered entries, or fabricate item facts", () => {
    const report = buildCodexDiscoveryCoverageReport({ discoveredItemIds: [CODEX_ENTRIES[0]!.id] });

    expect(report.claims).toEqual({ discoveryWrite: false, persistence: false, playerUi: false, undiscoveredVisible: false, itemFactFabrication: false });
    expect(report.blockers.map(blocker => blocker.id)).toEqual(["discovery-persistence", "player-codex-ui", "reload-and-duplicate-playtest"]);
    expect(report.undiscoveredEntryLeakCount).toBe(0);
  });
});
