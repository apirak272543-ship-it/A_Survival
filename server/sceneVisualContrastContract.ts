export const MIN_COLOR_DISTANCE = 0.05;
export const MAX_LIGHT_INTENSITY = 1.5;
export const MAX_GLOW_INTENSITY = 0.75;

type SceneVisualContrastIssueCode =
  | "INVALID_COLOR"
  | "LOW_TERRAIN_SKY_CONTRAST"
  | "LOW_TERRAIN_LIGHT_CONTRAST"
  | "INVALID_LIGHT_INTENSITY"
  | "EXCESSIVE_GLOW";

export type SceneVisualContrastInput = {
  fogColor: string;
  skyColor: string;
  lightColor: string;
  terrainColor: string;
  lightIntensity: number;
  glowIntensity?: number;
};

export type SceneVisualContrastIssue = {
  code: SceneVisualContrastIssueCode;
  message: string;
};

export type SceneVisualContrastResult = {
  valid: boolean;
  terrainSkyDistance: number | null;
  terrainLightDistance: number | null;
  issues: SceneVisualContrastIssue[];
};

function parseHexColor(value: string): [number, number, number] | null {
  if (!/^#[0-9a-f]{6}$/i.test(value)) return null;
  return [Number.parseInt(value.slice(1, 3), 16), Number.parseInt(value.slice(3, 5), 16), Number.parseInt(value.slice(5, 7), 16)];
}

function colorDistance(left: [number, number, number], right: [number, number, number]): number {
  const distance = Math.sqrt(left.reduce((sum, value, index) => sum + ((value - right[index]!) / 255) ** 2, 0));
  return Number(distance.toFixed(4));
}

export function validateSceneVisualContrast(input: SceneVisualContrastInput): SceneVisualContrastResult {
  const issues: SceneVisualContrastIssue[] = [];
  const colors = [input.fogColor, input.skyColor, input.lightColor, input.terrainColor].map(parseHexColor);
  const [fogColor, skyColor, lightColor, terrainColor] = colors;
  if (colors.some(color => color === null)) {
    issues.push({ code: "INVALID_COLOR", message: "fog, sky, light and terrain colors must be #RRGGBB values" });
  }

  const terrainSkyDistance = terrainColor && skyColor ? colorDistance(terrainColor, skyColor) : null;
  const terrainLightDistance = terrainColor && lightColor ? colorDistance(terrainColor, lightColor) : null;
  if (terrainSkyDistance !== null && terrainSkyDistance < MIN_COLOR_DISTANCE) {
    issues.push({ code: "LOW_TERRAIN_SKY_CONTRAST", message: `terrain/sky color distance must be at least ${MIN_COLOR_DISTANCE}` });
  }
  if (terrainLightDistance !== null && terrainLightDistance < MIN_COLOR_DISTANCE) {
    issues.push({ code: "LOW_TERRAIN_LIGHT_CONTRAST", message: `terrain/light color distance must be at least ${MIN_COLOR_DISTANCE}` });
  }
  if (!Number.isFinite(input.lightIntensity) || input.lightIntensity <= 0 || input.lightIntensity > MAX_LIGHT_INTENSITY) {
    issues.push({ code: "INVALID_LIGHT_INTENSITY", message: `light intensity must be greater than 0 and at most ${MAX_LIGHT_INTENSITY}` });
  }
  if (input.glowIntensity !== undefined && (!Number.isFinite(input.glowIntensity) || input.glowIntensity < 0 || input.glowIntensity > MAX_GLOW_INTENSITY)) {
    issues.push({ code: "EXCESSIVE_GLOW", message: `glow intensity must be between 0 and ${MAX_GLOW_INTENSITY}` });
  }

  return { valid: issues.length === 0, terrainSkyDistance, terrainLightDistance, issues };
}

export function validateSceneVisualContrastSet(treatments: Record<string, SceneVisualContrastInput>) {
  const results = Object.fromEntries(Object.entries(treatments).sort(([left], [right]) => left.localeCompare(right)).map(([mapId, treatment]) => [mapId, validateSceneVisualContrast(treatment)]));
  const invalidMapIds = Object.entries(results).filter(([, result]) => !result.valid).map(([mapId]) => mapId);
  return { valid: invalidMapIds.length === 0, results, invalidMapIds };
}
