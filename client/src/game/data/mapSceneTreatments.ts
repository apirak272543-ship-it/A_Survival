export type LandmarkKind = "spire" | "fungal" | "crystal" | "swamp" | "arch" | "crevasse" | "ruin" | "canopy" | "rift";

export type MapSceneTreatment = {
  fogColor: string;
  fogDensity: number;
  skyColor: string;
  lightColor: string;
  lightIntensity: number;
  terrainColor: string;
  landmarkKind: LandmarkKind;
  landmarkLabel: string;
  ambientEvent: string;
  hudPhrasing: string;
};

export const MAP_SCENE_TREATMENTS: Record<string, MapSceneTreatment> = {
  "obsidian-frontier": { fogColor: "#111b38", fogDensity: 0.07, skyColor: "#07101f", lightColor: "#7fd8ff", lightIntensity: 0.72, terrainColor: "#171323", landmarkKind: "ruin", landmarkLabel: "Distress pod and Obsidian Gate", ambientEvent: "AETHER WIND · crystal growth detected", hudPhrasing: "สนามอีเทอร์: เสถียร | ตรวจพบแร่เรืองแสงและสัญญาณผู้รอดชีวิต" },
  "map-002-ashen-obsidian-plains": { fogColor: "#5b231c", fogDensity: 0.08, skyColor: "#38140f", lightColor: "#ffa07a", lightIntensity: 0.6, terrainColor: "#3a2118", landmarkKind: "spire", landmarkLabel: "Obsidian heat spires", ambientEvent: "ASH STORM · visibility dropping", hudPhrasing: "อุณหภูมิพื้นผิว: วิกฤต | ตรวจพบฝุ่นละอองซิลิกา" },
  "map-003-bioluminescent-caverns": { fogColor: "#050010", fogDensity: 0.15, skyColor: "#0b001a", lightColor: "#00ffff", lightIntensity: 0.3, terrainColor: "#071426", landmarkKind: "fungal", landmarkLabel: "Mycelial vault", ambientEvent: "SPORE RELEASE · air filter active", hudPhrasing: "ความเข้มข้นของสปอร์: สูง | ระบบกรองอากาศทำงาน" },
  "map-004-crystalline-spires": { fogColor: "#e6e6fa", fogDensity: 0.03, skyColor: "#dbe9f2", lightColor: "#ffffff", lightIntensity: 1.2, terrainColor: "#273042", landmarkKind: "crystal", landmarkLabel: "Resonance spires", ambientEvent: "CRYSTAL RESONANCE · refractive wave", hudPhrasing: "ดัชนีการหักเหแสง: สูงสุด | ตรวจพบคลื่นความถี่เสียงสะท้อน" },
  "map-005-corrosive-acid-swamps": { fogColor: "#3b421b", fogDensity: 0.12, skyColor: "#28310d", lightColor: "#9acd32", lightIntensity: 0.5, terrainColor: "#253516", landmarkKind: "swamp", landmarkLabel: "Acid boardwalk remains", ambientEvent: "ACID DRIZZLE · seek stable ground", hudPhrasing: "ระดับความเป็นกรดในอากาศ: อันตราย | เกราะป้องกันถูกกัดกร่อน" },
  "map-006-magnetic-dunes": { fogColor: "#c0a080", fogDensity: 0.05, skyColor: "#6e3920", lightColor: "#ffd700", lightIntensity: 1, terrainColor: "#51341d", landmarkKind: "arch", landmarkLabel: "Lodestone arch", ambientEvent: "MAGNETIC STORM · navigation unstable", hudPhrasing: "สนามแม่เหล็กแปรปรวน: ระบบนำทางขัดข้อง" },
  "map-007-frozen-obsidian-crevasses": { fogColor: "#d3d3d3", fogDensity: 0.1, skyColor: "#132333", lightColor: "#b0e0e6", lightIntensity: 0.7, terrainColor: "#101e30", landmarkKind: "crevasse", landmarkLabel: "Glacial rift", ambientEvent: "BLIZZARD GUST · locate steam vent", hudPhrasing: "อุณหภูมิ: -45°C | ตรวจพบน้ำแข็งเกาะระบบขับเคลื่อน" },
  "map-008-ancient-obsidian-ruins": { fogColor: "#1a1a1a", fogDensity: 0.06, skyColor: "#161019", lightColor: "#e6e6fa", lightIntensity: 0.5, terrainColor: "#28232e", landmarkKind: "ruin", landmarkLabel: "Rune terminal complex", ambientEvent: "RUNE ACTIVATION · defense lattice awake", hudPhrasing: "ตรวจพบสัญญาณอารยธรรมโบราณ | พลังงานลึกลับเพิ่มขึ้น" },
  "map-009-overgrown-obsidian-jungle": { fogColor: "#1e3f20", fogDensity: 0.14, skyColor: "#0a1b0d", lightColor: "#98fb98", lightIntensity: 0.8, terrainColor: "#15351e", landmarkKind: "canopy", landmarkLabel: "Rootbound canopy", ambientEvent: "POLLEN SURGE · visibility reduced", hudPhrasing: "ความหนาแน่นของชีวมวล: หนาแน่นมาก | ทัศนวิสัยถูกจำกัด" },
  "map-011-cinder-caldera": { fogColor: "#3a0a08", fogDensity: 0.1, skyColor: "#1a0503", lightColor: "#ff9a6b", lightIntensity: 0.75, terrainColor: "#24100c", landmarkKind: "spire", landmarkLabel: "Shattered Smelter Arch", ambientEvent: "LAVA VENT · heat rising", hudPhrasing: "อุณหภูมิพื้นผิว: วิกฤต | ตรวจพบคลื่นความร้อนใต้พื้น" },
  "map-012-obsidian-spire-shelf": { fogColor: "#1a0f2e", fogDensity: 0.12, skyColor: "#0d0618", lightColor: "#b18cff", lightIntensity: 0.6, terrainColor: "#120a1f", landmarkKind: "spire", landmarkLabel: "Monolith of the North Wind", ambientEvent: "ASH GALE · visibility dropping", hudPhrasing: "ความเร็วลม: สูงมาก | ระยะยิงถูกลดลง 40%" },
  "map-013-brimstone-mire": { fogColor: "#2a2e0d", fogDensity: 0.14, skyColor: "#151a06", lightColor: "#d4ff4d", lightIntensity: 0.55, terrainColor: "#1c2210", landmarkKind: "swamp", landmarkLabel: "Boiling Sulfur Falls", ambientEvent: "SULFUR GEYSER · corrosion stacking", hudPhrasing: "ระดับกำมะถัน: อันตราย | เกราะกำลังถูกกัดกร่อน" },
  "map-014-magma-trench-bastion": { fogColor: "#2e0d05", fogDensity: 0.09, skyColor: "#180802", lightColor: "#ff6b3d", lightIntensity: 0.7, terrainColor: "#1e0f08", landmarkKind: "ruin", landmarkLabel: "Ruined Citadel Gate", ambientEvent: "BRIDGE TREMOR · structures unstable", hudPhrasing: "ความมั่นคงของสะพาน: ต่ำ | ตรวจพบแรงสั่นสะเทือน" },
  "map-015-heart-of-the-crucible": { fogColor: "#330011", fogDensity: 0.16, skyColor: "#120004", lightColor: "#ff4d88", lightIntensity: 0.5, terrainColor: "#1c0008", landmarkKind: "rift", landmarkLabel: "The Primal Core Anvil", ambientEvent: "CORE PULSE · stamina draining", hudPhrasing: "พลังงานแกนกลาง: เกินขีดจำกัด | สเตมินากำลังลดลง" },
  "map-010-void-infused-rift": { fogColor: "#0f001a", fogDensity: 0.18, skyColor: "#030008", lightColor: "#da70d6", lightIntensity: 0.4, terrainColor: "#14001f", landmarkKind: "rift", landmarkLabel: "Void singularity", ambientEvent: "VOID PULSE · gravity route shifting", hudPhrasing: "ความเสถียรของมิติ: วิกฤต | ตรวจพบการแทรกแซงจากความว่างเปล่า" },
};

export function getMapSceneTreatment(mapId: string) {
  return MAP_SCENE_TREATMENTS[mapId];
}
