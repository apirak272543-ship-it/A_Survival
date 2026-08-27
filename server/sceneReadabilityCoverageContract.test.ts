import { describe, expect, it } from "vitest";
import { OBSIDIAN_FRONTIER_VISUALS } from "../client/src/game/data/biomeProfiles";
import { buildSceneReadabilityCoverageReport } from "./sceneReadabilityCoverageContract";

describe("scene readability coverage contract", () => {
  it("projects the canonical Obsidian terrain layers and landmark dressing", () => {
    const report = buildSceneReadabilityCoverageReport({ mapId: "obsidian-frontier" });

    expect(report).toMatchObject({
      schemaVersion: "a-survival.scene-readability-coverage.v1",
      contractVersion: "1.0.0",
      auditOnly: true,
      readOnly: true,
      exportOnly: true,
      publishReady: false,
      valid: true,
      requestedMapId: "obsidian-frontier",
      resolvedMapId: "obsidian-frontier",
      mapSource: "caller",
      terrainAssetIds: ["terrain.ash", "terrain.obsidian"],
      terrainLayerCount: 2,
      decorationCount: 2,
      decorationCategoryCounts: { flora: 0, resource: 0, landmark: 2 },
      landmarkAssetIds: ["art.obsidian.portal-ruin", "art.obsidian.ancient-monolith"],
      readableBaseSignal: true,
      darkerAccentSignal: true,
      reliefAssetSignal: true,
      pathAssetSignal: false,
      floraAssetSignal: false,
      resourceAssetSignal: false,
    });
    expect(report.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(report.terrainAssetIds).toEqual(OBSIDIAN_FRONTIER_VISUALS.terrainAssetIds);
  });

  it("falls back safely for an unknown map without opening future-map rendering", () => {
    const report = buildSceneReadabilityCoverageReport({ mapId: "desert-expanse" });

    expect(report).toMatchObject({
      valid: false,
      requestedMapId: "desert-expanse",
      resolvedMapId: "default",
      mapSource: "default-fallback",
      terrainAssetIds: ["terrain.obsidian"],
      decorationCount: 0,
      issues: [{ code: "MAP_FALLBACK" }],
    });
    expect(report.visualPolicy).toEqual({ runtimeRenderApplied: false, visualAcceptance: false, screenshotCaptured: false, deviceAcceptance: false, assetManifestVerified: false, playerVisible: false });
  });

  it("is deterministic and exposes static signals without claiming a visual pass", () => {
    const input = { mapId: "obsidian-frontier" };
    const first = buildSceneReadabilityCoverageReport(input);
    const second = buildSceneReadabilityCoverageReport(input);

    expect(first).toEqual(second);
    expect(first.sourceCommentSignals).toEqual({ readableWalkableBase: true, darkerAccentBand: true, blockFirstIndividualObjects: true });
    expect(first.claims).toEqual({ staticMetadataProjected: true, sceneRendered: false, reliefVisuallyAccepted: false, playerVisible: false, assetBytesGenerated: false, assetManifestVerified: false, deviceAccepted: false, productionAccepted: false });
    expect(first.blockers.map(blocker => blocker.id)).toEqual(["runtime-scene-integration", "visual-screenshot-acceptance", "asset-manifest-verification", "camera-mode-visual-pass"]);
  });

  it("normalizes malformed map input to the safe default profile", () => {
    const report = buildSceneReadabilityCoverageReport({ mapId: { id: "obsidian-frontier" } });

    expect(report.requestedMapId).toBe("obsidian-frontier");
    expect(report.resolvedMapId).toBe("obsidian-frontier");
    expect(report.mapSource).toBe("caller");
    expect(report.issues).toEqual([]);
  });
});
