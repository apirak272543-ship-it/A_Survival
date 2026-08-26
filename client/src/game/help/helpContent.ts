export type HelpTopic = "identity" | "expedition" | "home" | "companion" | "offline" | "integrity";

export type HelpArticle = {
  id: HelpTopic;
  eyebrow: string;
  title: string;
  body: string;
  tips: string[];
};

export const HELP_ARTICLES: HelpArticle[] = [
  {
    id: "identity",
    eyebrow: "Player ID only",
    title: "เริ่มเล่นโดยไม่ต้องมีรหัสผ่าน",
    body: "Player ID คือชื่อที่ใช้แยกเซฟของคุณบนอุปกรณ์นี้ ไม่ใช่รหัสผ่านและไม่ควรใช้เป็นข้อมูลลับ. ระบบสร้างเซฟในเครื่องทันที แล้วค่อยซิงก์เมื่อเครือข่ายพร้อม.",
    tips: ["ใช้ชื่อที่จำได้ง่ายและยาวอย่างน้อย 3 ตัวอักษร", "การเล่นไม่รอผลซิงก์", "อย่าใช้ Player ID เป็นหลักฐานความเป็นเจ้าของบัญชี"],
  },
  {
    id: "expedition",
    eyebrow: "Explore · Fight · Gather",
    title: "ออกสำรวจอย่างปลอดภัย",
    body: "จอยสติ๊กซ้ายใช้เดินและลากไกลขึ้นเพื่อวิ่ง, ปุ่มดาบใช้โจมตี, ปุ่มสายฟ้าใช้ dash และปุ่ม pickaxe ใช้โต้ตอบ/เก็บทรัพยากร. บนคอมพิวเตอร์ใช้ WASD เดิน, Space โจมตี, Shift dash และ E โต้ตอบ.",
    tips: ["แตะช่องลัด 1–3 เพื่อเลือกไอเทม หรือกดปุ่ม 1–3 บนคีย์บอร์ด", "กด I หรือ Tab เพื่อเปิดคลังไอเทม และ Esc เพื่อเปิดตั้งค่า/พักเกม", "เก็บทรัพยากรในระยะของปุ่มโต้ตอบ แล้วกลับ Safe Zone เมื่อพลังชีวิตต่ำ", "ดูชื่อ NPC/landmark ด้านบนเพื่อหา event zone", "Void Reaper ปรากฏเมื่อเงื่อนไข night event ครบ"],
  },
  {
    id: "home",
    eyebrow: "Build · Grow · Harvest",
    title: "Home เป็นโลกส่วนตัวของคุณ",
    body: "วาง หมุน ย้าย และเก็บคืนสิ่งปลูกสร้างได้โดยคง item instance เดิม. เลือกเมล็ดที่ตรงกับดินก่อนปลูก แล้วกลับมาเก็บเกี่ยวเมื่อพืชโต.",
    tips: ["สีของดินบอกกลุ่มพืชที่ปลูกได้", "พื้นที่ทับซ้อนหรือเกิน grid จะถูกปฏิเสธ", "ผลผลิตมี provenance จากแปลงและเวลาเก็บเกี่ยว"],
  },
  {
    id: "companion",
    eyebrow: "NOVA-7 companion",
    title: "ให้คู่หูช่วยสำรวจ",
    body: "NOVA-7 ติดตามผู้เล่นเมื่อเปิด Follow. Collar และ Core ใช้ item instance จริง จึงสวมชิ้นเดียวซ้ำสองช่องไม่ได้. โบนัสถูกจำกัดเพดานเพื่อให้การเล่นสมดุล.",
    tips: ["แตะไอคอนอุ้งเท้าใน HUD เพื่อ Follow/Stay", "Core เพิ่มผลผลิตและ Collar เพิ่มระยะเก็บของ", "เมื่ออยู่ไกลเกิน คู่หูจะ teleport กลับอย่างปลอดภัย"],
  },
  {
    id: "offline",
    eyebrow: "Cache · Queue · Sync",
    title: "เล่นแบบออฟไลน์ได้อย่างไร",
    body: "เลือกแผนที่แล้วเกมบันทึก metadata และ key art ไว้ใน Cache Storage. การกระทำในเกมเก็บเป็นคิวในเครื่องและพยายามซิงก์เองเมื่อออนไลน์.",
    tips: ["เส้นทาง cached ยังมีหน้าจอเปลี่ยนฉากเสมอ", "สถานะออฟไลน์ไม่บล็อกการเล่น", "การดาวน์โหลด asset ไม่สำเร็จยังใช้ map metadata ที่มีได้"],
  },
  {
    id: "integrity",
    eyebrow: "Item provenance",
    title: "ทำไมเกมตรวจแหล่งที่มาของไอเทม",
    body: "ทุก item instance ต้องมี event ID และ provenance เช่น drop, craft, harvest หรือ reward. หากข้อมูลไม่ตรง ระบบจะกักรายการเพื่อให้ตรวจแทนการลบคลังทั้งหมด.",
    tips: ["อุปกรณ์หนึ่งชิ้นต่อหนึ่ง slot แต่ครอบครองหลาย instance ได้", "อย่าแก้ไฟล์เซฟเพื่อเพิ่มไอเทม", "ดูข้อความแจ้งเตือนก่อนพยายามซิงก์อีกครั้ง"],
  },
];

export const FIRST_RUN_HINTS = [
  { id: "identity", title: "Player ID ไม่ใช่รหัสผ่าน", body: "เลือก call-sign แล้วเซฟจะเริ่มบนอุปกรณ์ทันที", screen: "identity" },
  { id: "maps", title: "เตรียมแผนที่ก่อนเดินทาง", body: "ครั้งแรกเกมเตรียม module และ key art; รอบถัดไปใช้ cache ได้", screen: "maps" },
  { id: "game", title: "ควบคุมด้วยสองมือ", body: "จอยซ้ายเดิน/วิ่ง · ปุ่มขวาโจมตี, dash และเก็บทรัพยากร · ช่องลัดเลือกไอเทม", screen: "game" },
] as const;

export function getHelpArticle(topic: HelpTopic) {
  return HELP_ARTICLES.find(article => article.id === topic) ?? HELP_ARTICLES[0]!;
}
