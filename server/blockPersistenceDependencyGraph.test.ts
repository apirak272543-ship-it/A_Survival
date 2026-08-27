import { describe, expect, it } from "vitest";
import {
  BLOCK_PERSISTENCE_MAX_SAMPLE_COUNT,
  applyPersistedWorldBlockOverrides,
  buildBlockPersistenceDependencyGraph,
  buildBlockPersistenceDependencyGraphFromSources,
  isRuntimeBlockStateWriteAllowed,
  makeMapPlayerStateKey,
  readActiveBlockPersistenceSources,
  type BlockPersistenceSources,
} from "./generators/blockPersistenceDependencyGraph";

describe("block persistence dependency graph", () => {
  it("audits the canonical single-map, map-player-scoped persistence boundary", () => {
    const first = buildBlockPersistenceDependencyGraph({ seed: "b05-canonical", sampleCount: 2 });
    const second = buildBlockPersistenceDependencyGraph({ seed: "b05-canonical", sampleCount: 2 });

    expect(first.summary).toMatchObject({
      runtimeMapId: "obsidian-frontier",
      runtimeAllowedMapIds: ["obsidian-frontier"],
      runtimeAllowedMapCount: 1,
      runtimeWriteAllowedForCanonicalMap: true,
      futureMapWriteBlocked: true,
      compositeKeyFormat: "[mapId+playerId]",
      overrideKeyPattern: "integer:x:integer:y:integer:z",
      tombstoneValue: null,
      replacementValue: "module-id",
      generatedMeshesPersisted: false,
      persistedFields: ["mapId", "playerId", "worldBlockOverrides", "updatedAt"],
      runtimeOwnerPresent: true,
      storageOwnerPresent: true,
      issueCounts: {},
      policy: {
        tombstoneRemovesGeneratedBlock: true,
        moduleIdRestoresOrAddsBlock: true,
        mapAndPlayerNamespaceIsRequired: true,
        onlyCanonicalRuntimeMapMayWrite: true,
        generatedMeshesNeverPersisted: true,
        runtimeImportAllowed: false,
        playerVisible: false,
        cacheable: false,
        outputIsAuditOnly: true,
      },
    });
    expect(first.summary.sourceContentHash).toMatch(/^[a-f0-9]{64}$/);
    expect(first.graph.valid).toBe(true);
    expect(first.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(first.artifact.contentHash).toBe(second.artifact.contentHash);
    expect(first.graph).toEqual(second.graph);
  });

  it("applies null tombstones and module-id replacements/additions deterministically", () => {
    const generated = [
      { key: "0:0:0", blockId: "terrain.obsidian" },
      { key: "1:0:0", blockId: "terrain.ash" },
    ];
    expect(applyPersistedWorldBlockOverrides(generated, {
      "1:0:0": null,
      "2:0:0": "player.placed",
      "3:0": "ignored",
      invalid: "ignored",
    })).toEqual([
      { key: "0:0:0", blockId: "terrain.obsidian" },
      { key: "2:0:0", blockId: "player.placed" },
    ]);
    expect(applyPersistedWorldBlockOverrides(generated, { "0:0:0": "terrain.ash" })).toEqual([
      { key: "0:0:0", blockId: "terrain.ash" },
      { key: "1:0:0", blockId: "terrain.ash" },
    ]);
  });

  it("keeps runtime writes single-map and state identities scoped to map plus player", () => {
    const source = readActiveBlockPersistenceSources();
    expect(isRuntimeBlockStateWriteAllowed("obsidian-frontier", source)).toBe(true);
    expect(isRuntimeBlockStateWriteAllowed("ashen-hellscape", source)).toBe(false);
    expect(makeMapPlayerStateKey("obsidian-frontier", "player-a")).not.toBe(makeMapPlayerStateKey("obsidian-frontier", "player-b"));
    expect(makeMapPlayerStateKey("obsidian-frontier", "player-a")).not.toBe(makeMapPlayerStateKey("ashen-hellscape", "player-a"));
  });

  it("turns unsafe map, override, mesh, and owner policies into required blockers", () => {
    const source = readActiveBlockPersistenceSources();
    const invalid: BlockPersistenceSources = {
      ...source,
      runtimeMapId: "ashen-hellscape",
      runtimeAllowedMapIds: ["obsidian-frontier", "ashen-hellscape"],
      compositeKeyFormat: "mapId-only" as never,
      overrideKeyPattern: "any-string" as never,
      tombstoneValue: "delete" as never,
      replacementValue: "generated-mesh" as never,
      generatedMeshesPersisted: true,
      runtimeOwnerPresent: false,
      storageOwnerPresent: false,
    };
    const output = buildBlockPersistenceDependencyGraphFromSources({ seed: "b05-invalid", sampleCount: 2 }, invalid);

    expect(output.graph.valid).toBe(false);
    expect(output.summary.runtimeWriteAllowedForCanonicalMap).toBe(false);
    expect(output.summary.futureMapWriteBlocked).toBe(true);
    expect(output.summary.issueCounts).toMatchObject({
      "runtime-map-id-invalid": 1,
      "runtime-allow-list-invalid": 1,
      "composite-key-invalid": 1,
      "override-key-pattern-invalid": 1,
      "tombstone-semantics-missing": 1,
      "replacement-semantics-missing": 1,
      "generated-mesh-persistence-risk": 1,
      "runtime-owner-missing": 1,
      "storage-owner-missing": 1,
    });
    expect(output.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
  });

  it("changes the artifact hash when persistence policy changes and rejects invalid bounds", () => {
    const source = readActiveBlockPersistenceSources();
    const original = buildBlockPersistenceDependencyGraphFromSources({ seed: "b05-hash", sampleCount: 2 }, source);
    const changed = buildBlockPersistenceDependencyGraphFromSources(
      { seed: "b05-hash", sampleCount: 2 },
      { ...source, generatedMeshesPersisted: true },
    );
    expect(changed.artifact.contentHash).not.toBe(original.artifact.contentHash);
    expect(() => buildBlockPersistenceDependencyGraph({ seed: "" })).toThrow(/seed/);
    expect(() => buildBlockPersistenceDependencyGraph({ seed: "b05", sampleCount: 0 })).toThrow(/sampleCount/);
    expect(() => buildBlockPersistenceDependencyGraph({ seed: "b05", sampleCount: BLOCK_PERSISTENCE_MAX_SAMPLE_COUNT + 1 })).toThrow(/sampleCount/);
    expect(() => makeMapPlayerStateKey("", "player")).toThrow(/mapId/);
  });

  it("keeps the dependency graph bounded and audit-only", () => {
    const output = buildBlockPersistenceDependencyGraph({ seed: "b05-partial", sampleCount: 1 });
    expect(output.graph.nodes).toHaveLength(3);
    expect(output.summary.policy.outputIsAuditOnly).toBe(true);
  });
});
