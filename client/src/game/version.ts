export const GAME_VERSION = "100.1.1.1";

export const VERSION_POLICY = {
  major: "อัปเดตเนื้อหาหลักหรือการเปลี่ยนแปลงระดับใหญ่",
  mapsAndSystems: "แผนที่ใหม่หรือระบบเกมใหม่",
  patch: "แพตช์แก้ไข ปรับสมดุล หรือปรับปรุงย่อย",
  event: "กิจกรรมหรือเนื้อหาตามฤดูกาล",
} as const;

export function formatVersionLabel(version = GAME_VERSION) {
  return `Build ${version}`;
}
