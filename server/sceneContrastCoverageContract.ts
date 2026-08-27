import { MAP_SCENE_TREATMENTS, type MapSceneTreatment } from "../client/src/game/data/mapSceneTreatments";

export const SCENE_CONTRAST_COVERAGE_VERSION = "0.1.0" as const;
export const MIN_SCENE_CONTRAST_RATIO = 1.15 as const;

const HEX_COLOR_PATTERN = /^#[0-9a-f]{6}$/i;

type SceneContrastBlockerCode =
  | "invalid-color"
  | "insufficient-terrain-sky-contrast"
  | "insufficient-terrain-fog-contrast"
  | "invalid-light-intensity";

export type SceneContrastBlocker = Readonly<{
  mapId: string;
  code: SceneContrastBlockerCode;
  reason: string;
}>;

export type SceneContrastSnapshot = Readonly<{
  mapId: string;
  terrainSkyContrast: number | null;
  terrainFogContrast: number | null;
  lightIntensity: number | null;
  colorsValid: boolean;
}>;

export type SceneContrastCoverageReport = Readonly<{
  version: typeof SCENE_CONTRAST_COVERAGE_VERSION;
  source: "MAP_SCENE_TREATMENTS" | "provided-treatments";
  totalScenes: number;
  snapshots: readonly SceneContrastSnapshot[];
  minimumObserved: Readonly<{
    terrainSkyContrast: number | null;
    terrainFogContrast: number | null;
    lightIntensity: number | null;
  }>;
  blockers: readonly SceneContrastBlocker[];
  status: "complete" | "blocked";
  policy: Readonly<{
    runtimeImportAllowed: false;
    playerVisible: false;
    cacheable: false;
    runtimeScreenshot: false;
    deviceAcceptance: false;
  }>;
}>;

function roundMetric(value: number): number {
  return Number(value.toFixed(3));
}

function parseHexColor(value: string): [number, number, number] | null {
  if (!HEX_COLOR_PATTERN.test(value)) return null;
  return [
    Number.parseInt(value.slice(1, 3), 16) / 255,
    Number.parseInt(value.slice(3, 5), 16) / 255,
    Number.parseInt(value.slice(5, 7), 16) / 255,
  ];
}

function linearize(channel: number): number {
  return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
}

function relativeLuminance(color: [number, number, number]): number {
  return 0.2126 * linearize(color[0]) + 0.7152 * linearize(color[1]) + 0.0722 * linearize(color[2]);
}

function contrastRatio(first: [number, number, number], second: [number, number, number]): number {
  const firstLuminance = relativeLuminance(first);
  const secondLuminance = relativeLuminance(second);
  const brighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return roundMetric((brighter + 0.05) / (darker + 0.05));
}

function finiteIntensity(value: number): number | null {
  return Number.isFinite(value) && value >= 0 && value <= 2 ? roundMetric(value) : null;
}

function addBlocker(blockers: SceneContrastBlocker[], mapId: string, code: SceneContrastBlockerCode, reason: string): void {
  blockers.push({ mapId, code, reason });
}

/**
 * Audits source-level scene readability inputs only. It does not inspect rendered meshes,
 * generate assets, alter lighting, or claim player/device visual acceptance.
 */
export function auditSceneContrastCoverage(
  treatments: Readonly<Record<string, MapSceneTreatment>> = MAP_SCENE_TREATMENTS,
): SceneContrastCoverageReport {
  const snapshots: SceneContrastSnapshot[] = [];
  const blockers: SceneContrastBlocker[] = [];

  for (const [mapId, treatment] of Object.entries(treatments).sort(([left], [right]) => left.localeCompare(right))) {
    const terrain = parseHexColor(treatment.terrainColor);
    const sky = parseHexColor(treatment.skyColor);
    const fog = parseHexColor(treatment.fogColor);
    const terrainSkyContrast = terrain && sky ? contrastRatio(terrain, sky) : null;
    const terrainFogContrast = terrain && fog ? contrastRatio(terrain, fog) : null;
    const lightIntensity = finiteIntensity(treatment.lightIntensity);
    const colorsValid = terrain !== null && sky !== null && fog !== null;

    if (!colorsValid) {
      addBlocker(blockers, mapId, "invalid-color", "terrain, sky และ fog ต้องเป็นสี hex 6 หลักที่ตรวจได้");
    } else if ((terrainSkyContrast ?? 0) < MIN_SCENE_CONTRAST_RATIO) {
      addBlocker(blockers, mapId, "insufficient-terrain-sky-contrast", `terrain/sky contrast ต่ำกว่าเกณฑ์ ${MIN_SCENE_CONTRAST_RATIO}`);
    } else if ((terrainFogContrast ?? 0) < MIN_SCENE_CONTRAST_RATIO) {
      addBlocker(blockers, mapId, "insufficient-terrain-fog-contrast", `terrain/fog contrast ต่ำกว่าเกณฑ์ ${MIN_SCENE_CONTRAST_RATIO}`);
    }

    if (lightIntensity === null) {
      addBlocker(blockers, mapId, "invalid-light-intensity", "light intensity ต้องเป็นตัวเลขตั้งแต่ 0 ถึง 2");
    }

    snapshots.push({ mapId, terrainSkyContrast, terrainFogContrast, lightIntensity, colorsValid });
  }

  blockers.sort((left, right) => left.mapId.localeCompare(right.mapId) || left.code.localeCompare(right.code));
  const validSnapshots = snapshots.filter(snapshot => snapshot.colorsValid && snapshot.lightIntensity !== null);
  const minimum = (selector: (snapshot: SceneContrastSnapshot) => number | null): number | null => {
    const values = validSnapshots.map(selector).filter((value): value is number => value !== null);
    return values.length > 0 ? Math.min(...values) : null;
  };

  return Object.freeze({
    version: SCENE_CONTRAST_COVERAGE_VERSION,
    source: treatments === MAP_SCENE_TREATMENTS ? "MAP_SCENE_TREATMENTS" : "provided-treatments",
    totalScenes: snapshots.length,
    snapshots: Object.freeze(snapshots),
    minimumObserved: Object.freeze({
      terrainSkyContrast: minimum(snapshot => snapshot.terrainSkyContrast),
      terrainFogContrast: minimum(snapshot => snapshot.terrainFogContrast),
      lightIntensity: minimum(snapshot => snapshot.lightIntensity),
    }),
    blockers: Object.freeze(blockers),
    status: blockers.length === 0 ? "complete" : "blocked",
    policy: Object.freeze({
      runtimeImportAllowed: false as const,
      playerVisible: false as const,
      cacheable: false as const,
      runtimeScreenshot: false as const,
      deviceAcceptance: false as const,
    }),
  });
}
