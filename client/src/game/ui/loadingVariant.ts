import { MAP_REGISTRY } from "@/game/data/maps";
import type { DirectRouteScreen } from "@/game/routing/directRoute";

export type LoadingVariant = {
  kind: "lobby" | "home" | "maps" | "biome" | "default";
  eyebrow: string;
  statusLabel: string;
  metric: string;
  keyArt?: string;
};

const baseCampArt = MAP_REGISTRY[0]?.keyArt;

export function resolveLoadingVariant(destination: DirectRouteScreen, mapId?: string): LoadingVariant {
  const map = mapId ? MAP_REGISTRY.find(candidate => candidate.id === mapId) : undefined;
  if (map) return { kind: "biome", eyebrow: `EXPEDITION · T${map.threat}`, statusLabel: "ตรวจสภาพแวดล้อม", metric: `THREAT ${"◆".repeat(map.threat)}`, keyArt: map.keyArt };
  if (destination === "lobby") return { kind: "lobby", eyebrow: "FRONTIER RELAY", statusLabel: "กำลังเชื่อมต่อห้องโถงกลางและซิงโครไนซ์สัญญาณพันธมิตร...", metric: "RELAY LINK", keyArt: baseCampArt };
  if (destination === "home") return { kind: "home", eyebrow: "PERSONAL INSTANCE", statusLabel: "กำลังเปิดระบบป้องกันภัยและเตรียมความพร้อมฐานที่มั่น...", metric: "SHIELD 100%", keyArt: baseCampArt };
  if (destination === "maps") return { kind: "maps", eyebrow: "MAP OBSERVATORY", statusLabel: "กำลังสแกนพิกัดดวงดาวและคำนวณเส้นทางข้ามมิติ...", metric: "SECTOR SCAN", keyArt: baseCampArt };
  return { kind: "default", eyebrow: "FRONTIER RELAY", statusLabel: "กำลังปรับเส้นทางพลังงาน", metric: "SIGNAL ALIGN", keyArt: baseCampArt };
}
