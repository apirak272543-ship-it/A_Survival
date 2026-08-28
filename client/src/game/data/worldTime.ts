import { getMapDefinition } from "@/game/data/maps";

export const DAY_LENGTH_MS = 15 * 60 * 1000;
export const NIGHT_LENGTH_MS = 15 * 60 * 1000;
export const FULL_CYCLE_MS = DAY_LENGTH_MS + NIGHT_LENGTH_MS;

export type BiomeTimeMode = "cycle" | "eternal-night" | "eternal-day" | "void";

export type WorldLighting = {
  phase: "day" | "night";
  progress: number;
  sky: string;
  fog: string;
  ambient: string;
  directional: string;
  motionIntensity: number;
  ambience: "day-wind" | "night-chimes" | "void-hum" | "ember-rumble";
};

export const BIOME_TIME_MODES: Record<string, BiomeTimeMode> = {
  "obsidian-frontier": "cycle",
  "ashen-hellscape": "eternal-night",
  "mars-expanse": "cycle",
  "saharan-glass": "cycle",
  "congo-verdant": "cycle",
  "stonecrest-range": "cycle",
  "wildpine-highlands": "cycle",
  "astral-drift": "void",
};

export function getWorldLighting(mapId: string, now = Date.now()): WorldLighting {
  const mode = getMapDefinition(mapId)?.timeMode ?? BIOME_TIME_MODES[mapId] ?? "cycle";
  const safeNow = Number.isFinite(now) ? Math.max(0, Math.floor(now)) : 0;
  const cyclePosition = safeNow % FULL_CYCLE_MS;
  const isDay = cyclePosition < DAY_LENGTH_MS;
  const progress = (isDay ? cyclePosition : cyclePosition - DAY_LENGTH_MS) / DAY_LENGTH_MS;

  if (mode === "eternal-night") {
    return {
      phase: "night",
      progress: 1,
      sky: "#24091e",
      fog: "#7c2435",
      ambient: "#6e1f32",
      directional: "#ff6b45",
      motionIntensity: 0.9,
      ambience: "ember-rumble",
    };
  }

  if (mode === "void") {
    return {
      phase: "night",
      progress: 1,
      sky: "#07031d",
      fog: "#25125d",
      ambient: "#1f1760",
      directional: "#9d7bff",
      motionIntensity: 0.55,
      ambience: "void-hum",
    };
  }

  if (isDay) {
    return {
      phase: "day",
      progress,
      sky: "#4da3d9",
      fog: "#446f91",
      ambient: "#678fb0",
      directional: "#f6d365",
      motionIntensity: 0.45,
      ambience: "day-wind",
    };
  }

  return {
    phase: "night",
    progress,
    sky: "#09152f",
    fog: "#1c3a68",
    ambient: "#17315a",
    directional: "#8c68e8",
    motionIntensity: 0.78,
    ambience: "night-chimes",
  };
}

export const WEEKLY_EVENTS = [
  {
    id: "corruption-surge",
    title: "Corruption Surge",
    subtitle: "ปิดผนึกเสาอาคมที่กำลังทำให้ซอมบี้วิวัฒน์",
    mapId: "obsidian-frontier",
    reward: "Aether Blade Cache",
    accent: "#ff1e56",
    objective: "กำจัด Corrupted Zombies 0 / 75",
  },
  {
    id: "verdant-harvest",
    title: "Verdant Harvest",
    subtitle: "ปลูกและเก็บเกี่ยวพืชพลังงานจากสวนส่วนตัว",
    mapId: "home",
    reward: "Verdant Humus Kit",
    accent: "#7ee787",
    objective: "เก็บเกี่ยวพืช 0 / 24",
  },
] as const;
