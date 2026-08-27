export type CreatorTemplateKind = "icon" | "tile" | "skin" | "atlas";
export type CreatorCompositionSubject = "block" | "structure" | "item" | "weapon" | "animation";
export const CREATOR_WORKBENCH_MAX_CANVAS = 32;

export type CreatorTemplatePreset = {
  id: string;
  title: string;
  description: string;
  category: string;
  kind: CreatorTemplateKind;
  width: number;
  height: number;
  symbol: string;
};

export type CreatorSkinPart = {
  id: string;
  label: string;
  detail: string;
};

export function getCompositionSubjectForTemplate(template: CreatorTemplatePreset): CreatorCompositionSubject {
  if (template.kind === "tile") return "block";
  if (template.kind === "skin") return "animation";
  if (template.id === "weapon-icon") return "weapon";
  return "item";
}

export function isWorkbenchCompositionTemplate(template: CreatorTemplatePreset): boolean {
  return template.kind !== "atlas" && template.width <= CREATOR_WORKBENCH_MAX_CANVAS && template.height <= CREATOR_WORKBENCH_MAX_CANVAS;
}

export type CreatorSkinLayoutPart = CreatorSkinPart & {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Canonical no-code authoring templates shared by CreatorStudio and Workbench. */
export const CREATOR_TEMPLATE_PRESETS: CreatorTemplatePreset[] = [
  {
    id: "plant-icon",
    title: "พืช / ใบไม้",
    description: "ไอคอนพิกเซลสำหรับพืช เมล็ด และผลผลิต",
    category: "พืช",
    kind: "icon",
    width: 16,
    height: 16,
    symbol: "✦",
  },
  {
    id: "weapon-icon",
    title: "อาวุธ",
    description: "ช่องวาดทรงอาวุธพร้อมพื้นที่เผื่อเงา",
    category: "อาวุธ",
    kind: "icon",
    width: 24,
    height: 24,
    symbol: "⚔",
  },
  {
    id: "item-icon",
    title: "ไอเทม",
    description: "ไอคอนของใช้ วัตถุดิบ และของสะสม",
    category: "ไอเทม",
    kind: "icon",
    width: 16,
    height: 16,
    symbol: "◆",
  },
  {
    id: "terrain-tile",
    title: "พื้น / บล็อก",
    description: "พื้นผิว tile สำหรับบล็อกและภูมิประเทศ",
    category: "สิ่งแวดล้อม",
    kind: "tile",
    width: 16,
    height: 16,
    symbol: "▦",
  },
  {
    id: "character-skin",
    title: "สกินตัวละคร",
    description: "ผิวตัวละครแบบแยกชิ้นส่วน ไม่ต้องวาดสามเหลี่ยม",
    category: "ตัวละคร",
    kind: "skin",
    width: 64,
    height: 64,
    symbol: "♙",
  },
  {
    id: "survivor-pixel-32",
    title: "ผู้รอดชีวิต 32 × 32",
    description: "template เบื้องต้นสำหรับ manifest ตัวละคร/แอนิเมชันแบบ bounded",
    category: "ตัวละคร",
    kind: "skin",
    width: 32,
    height: 32,
    symbol: "♙",
  },
  {
    id: "atlas-sheet",
    title: "Atlas / ชุดภาพ",
    description: "รวมหน้าภาพหลายช่องสำหรับ asset ที่ใช้ร่วมกัน",
    category: "ชุดภาพ",
    kind: "atlas",
    width: 64,
    height: 64,
    symbol: "▤",
  },
];

export const CREATOR_SKIN_PARTS: CreatorSkinPart[] = [
  { id: "head", label: "หัว", detail: "ทรงและสีผม/หมวก" },
  { id: "face", label: "ใบหน้า", detail: "ตา ปาก และรายละเอียดหน้า" },
  { id: "torso", label: "ลำตัว", detail: "เสื้อ เกราะ หรือชุดหลัก" },
  { id: "left-arm", label: "แขนซ้าย", detail: "แขนและส่วนต่ออุปกรณ์" },
  { id: "right-arm", label: "แขนขวา", detail: "แขนและส่วนต่ออุปกรณ์" },
  { id: "left-leg", label: "ขาซ้าย", detail: "กางเกง รองเท้า และเงา" },
  { id: "right-leg", label: "ขาขวา", detail: "กางเกง รองเท้า และเงา" },
];

export const CREATOR_SKIN_LAYOUT_PARTS: Record<string, CreatorSkinLayoutPart> = {
  head: { id: "head", label: "หัว", detail: "ทรงและสีผม/หมวก", x: 0, y: 0, width: 32, height: 16 },
  face: { id: "face", label: "ใบหน้า", detail: "ตา ปาก และรายละเอียดหน้า", x: 32, y: 0, width: 32, height: 16 },
  torso: { id: "torso", label: "ลำตัว", detail: "เสื้อ เกราะ หรือชุดหลัก", x: 0, y: 16, width: 32, height: 24 },
  "left-arm": { id: "left-arm", label: "แขนซ้าย", detail: "แขนและส่วนต่ออุปกรณ์", x: 32, y: 16, width: 16, height: 24 },
  "right-arm": { id: "right-arm", label: "แขนขวา", detail: "แขนและส่วนต่ออุปกรณ์", x: 48, y: 16, width: 16, height: 24 },
  "left-leg": { id: "left-leg", label: "ขาซ้าย", detail: "กางเกง รองเท้า และเงา", x: 0, y: 40, width: 16, height: 24 },
  "right-leg": { id: "right-leg", label: "ขาขวา", detail: "กางเกง รองเท้า และเงา", x: 16, y: 40, width: 16, height: 24 },
};
