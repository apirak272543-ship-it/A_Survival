import { getBiomeVisualProfile, OBSIDIAN_FRONTIER_VISUALS, type BiomeDecoration, type BiomeVisualProfile } from "../client/src/game/data/biomeProfiles";
import { hashStableJson } from "./generators/commonGeneratorApi";

export const SCENE_READABILITY_COVERAGE_SCHEMA_VERSION = "a-survival.scene-readability-coverage.v1" as const;
export const SCENE_READABILITY_COVERAGE_CONTRACT_VERSION = "1.0.0" as const;
const MAX_ASSET_ID_LENGTH = 128;
const MAX_DECORATION_DIMENSION = 64;
const MAX_DECORATION_EMISSIVE = 1;

type SceneReadabilityIssue = {
  code: "MAP_FALLBACK" | "EMPTY_TERRAIN_ASSET" | "DUPLICATE_TERRAIN_ASSET" | "INVALID_DECORATION" | "DECORATION_OUT_OF_BOUNDS";
  detail: string;
  assetId?: string;
};

export type SceneReadabilityCoverageInput = {
  mapId?: unknown;
};

export type SceneReadabilityCoverageReport = {
  schemaVersion: typeof SCENE_READABILITY_COVERAGE_SCHEMA_VERSION;
  contractVersion: typeof SCENE_READABILITY_COVERAGE_CONTRACT_VERSION;
  auditOnly: true;
  readOnly: true;
  exportOnly: true;
  publishReady: false;
  valid: boolean;
  requestedMapId: string;
  resolvedMapId: string;
  mapSource: "caller" | "default-fallback";
  terrainAssetIds: string[];
  terrainLayerCount: number;
  decorationCount: number;
  decorationCategoryCounts: Record<BiomeDecoration["category"], number>;
  landmarkAssetIds: string[];
  readableBaseSignal: boolean;
  darkerAccentSignal: boolean;
  reliefAssetSignal: boolean;
  pathAssetSignal: boolean;
  floraAssetSignal: boolean;
  resourceAssetSignal: boolean;
  sourceCommentSignals: {
    readableWalkableBase: boolean;
    darkerAccentBand: boolean;
    blockFirstIndividualObjects: boolean;
  };
  visualPolicy: {
    runtimeRenderApplied: false;
    visualAcceptance: false;
    screenshotCaptured: false;
    deviceAcceptance: false;
    assetManifestVerified: false;
    playerVisible: false;
  };
  issues: SceneReadabilityIssue[];
  blockers: [
    { id: "runtime-scene-integration"; required: true; status: "missing-evidence"; reason: string },
    { id: "visual-screenshot-acceptance"; required: true; status: "missing-evidence"; reason: string },
    { id: "asset-manifest-verification"; required: true; status: "missing-evidence"; reason: string },
    { id: "camera-mode-visual-pass"; required: true; status: "missing-evidence"; reason: string },
  ];
  claims: {
    staticMetadataProjected: true;
    sceneRendered: false;
    reliefVisuallyAccepted: false;
    playerVisible: false;
    assetBytesGenerated: false;
    assetManifestVerified: false;
    deviceAccepted: false;
    productionAccepted: false;
  };
  contentSha256: string;
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function getCategoryCounts(decorations: readonly BiomeDecoration[]) {
  return {
    flora: decorations.filter(decoration => decoration.category === "flora").length,
    resource: decorations.filter(decoration => decoration.category === "resource").length,
    landmark: decorations.filter(decoration => decoration.category === "landmark").length,
  } satisfies Record<BiomeDecoration["category"], number>;
}

function buildBlockers(): SceneReadabilityCoverageReport["blockers"] {
  return [
    { id: "runtime-scene-integration", required: true, status: "missing-evidence", reason: "this contract projects biome metadata and does not edit or invoke client/src/game/scene.ts" },
    { id: "visual-screenshot-acceptance", required: true, status: "missing-evidence", reason: "no screenshot or human visual review is performed by this static audit" },
    { id: "asset-manifest-verification", required: true, status: "missing-evidence", reason: "asset IDs are reported from biome metadata but exact active-manifest/SHA/provenance verification is a separate gate" },
    { id: "camera-mode-visual-pass", required: true, status: "missing-evidence", reason: "readability across overhead, first-person, side, and target viewport sizes is not tested here" },
  ];
}

function normalizeProfile(mapId: unknown): { requestedMapId: string; profile: BiomeVisualProfile; mapSource: "caller" | "default-fallback"; issues: SceneReadabilityIssue[] } {
  const requestedMapId = isNonEmptyString(mapId) ? mapId.trim().slice(0, MAX_ASSET_ID_LENGTH) : "obsidian-frontier";
  const isCanonical = requestedMapId === OBSIDIAN_FRONTIER_VISUALS.mapId;
  return {
    requestedMapId,
    profile: getBiomeVisualProfile(requestedMapId),
    mapSource: isCanonical ? "caller" : "default-fallback",
    issues: isCanonical ? [] : [{ code: "MAP_FALLBACK", detail: `map ${requestedMapId} is not the canonical playable visual slice; safe default profile selected` }],
  };
}

function inspectTerrain(profile: BiomeVisualProfile, issues: SceneReadabilityIssue[]) {
  if (profile.terrainAssetIds.length === 0) issues.push({ code: "EMPTY_TERRAIN_ASSET", detail: `visual profile ${profile.mapId} has no terrain asset IDs` });
  const seen = new Set<string>();
  for (const assetId of profile.terrainAssetIds) {
    if (!isNonEmptyString(assetId)) issues.push({ code: "EMPTY_TERRAIN_ASSET", detail: "terrain asset ID must be a non-empty string" });
    if (seen.has(assetId)) issues.push({ code: "DUPLICATE_TERRAIN_ASSET", detail: `terrain asset ${assetId} is repeated`, assetId });
    seen.add(assetId);
  }
}

function inspectDecorations(profile: BiomeVisualProfile, issues: SceneReadabilityIssue[]) {
  for (const decoration of profile.decorations) {
    const validShape = isNonEmptyString(decoration.assetId) && decoration.assetId.length <= MAX_ASSET_ID_LENGTH && [decoration.position.x, decoration.position.z, decoration.width, decoration.height, decoration.yOffset ?? 0, decoration.emissive ?? 0].every(value => Number.isFinite(value)) && decoration.width > 0 && decoration.height > 0;
    if (!validShape) {
      issues.push({ code: "INVALID_DECORATION", detail: `decoration ${String(decoration.assetId)} has an invalid asset/position/size/emissive value`, assetId: isNonEmptyString(decoration.assetId) ? decoration.assetId : undefined });
      continue;
    }
    if (decoration.width > MAX_DECORATION_DIMENSION || decoration.height > MAX_DECORATION_DIMENSION || Math.abs(decoration.position.x) > MAX_DECORATION_DIMENSION || Math.abs(decoration.position.z) > MAX_DECORATION_DIMENSION || (decoration.emissive ?? 0) > MAX_DECORATION_EMISSIVE) issues.push({ code: "DECORATION_OUT_OF_BOUNDS", detail: `decoration ${decoration.assetId} exceeds static readability-audit bounds`, assetId: decoration.assetId });
  }
}

export function buildSceneReadabilityCoverageReport(input: SceneReadabilityCoverageInput = {}): SceneReadabilityCoverageReport {
  const normalized = normalizeProfile(input.mapId);
  const issues = [...normalized.issues];
  inspectTerrain(normalized.profile, issues);
  inspectDecorations(normalized.profile, issues);
  const terrainAssetIds = [...normalized.profile.terrainAssetIds];
  const decorations = normalized.profile.decorations.map(decoration => ({ ...decoration, position: { ...decoration.position } }));
  const decorationCategoryCounts = getCategoryCounts(decorations);
  const landmarkAssetIds = decorations.filter(decoration => decoration.category === "landmark").map(decoration => decoration.assetId);
  const payload = {
    schemaVersion: SCENE_READABILITY_COVERAGE_SCHEMA_VERSION,
    contractVersion: SCENE_READABILITY_COVERAGE_CONTRACT_VERSION,
    auditOnly: true,
    readOnly: true,
    exportOnly: true,
    publishReady: false,
    valid: issues.length === 0,
    requestedMapId: normalized.requestedMapId,
    resolvedMapId: normalized.profile.mapId,
    mapSource: normalized.mapSource,
    terrainAssetIds,
    terrainLayerCount: terrainAssetIds.length,
    decorationCount: decorations.length,
    decorationCategoryCounts,
    landmarkAssetIds,
    readableBaseSignal: normalized.profile.mapId === OBSIDIAN_FRONTIER_VISUALS.mapId && terrainAssetIds.includes("terrain.ash"),
    darkerAccentSignal: normalized.profile.mapId === OBSIDIAN_FRONTIER_VISUALS.mapId && terrainAssetIds.includes("terrain.obsidian"),
    reliefAssetSignal: landmarkAssetIds.length > 0,
    pathAssetSignal: terrainAssetIds.some(assetId => assetId.includes("path")) || decorations.some(decoration => decoration.assetId.includes("path")),
    floraAssetSignal: decorationCategoryCounts.flora > 0,
    resourceAssetSignal: decorationCategoryCounts.resource > 0,
    sourceCommentSignals: { readableWalkableBase: normalized.profile.mapId === OBSIDIAN_FRONTIER_VISUALS.mapId, darkerAccentBand: normalized.profile.mapId === OBSIDIAN_FRONTIER_VISUALS.mapId, blockFirstIndividualObjects: true },
    visualPolicy: { runtimeRenderApplied: false as const, visualAcceptance: false as const, screenshotCaptured: false as const, deviceAcceptance: false as const, assetManifestVerified: false as const, playerVisible: false as const },
    issues,
    blockers: buildBlockers(),
    claims: { staticMetadataProjected: true as const, sceneRendered: false as const, reliefVisuallyAccepted: false as const, playerVisible: false as const, assetBytesGenerated: false as const, assetManifestVerified: false as const, deviceAccepted: false as const, productionAccepted: false as const },
  } satisfies Omit<SceneReadabilityCoverageReport, "contentSha256">;
  return { ...payload, contentSha256: hashStableJson(payload as never) };
}
