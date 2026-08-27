# Story and Quest Progression Generator

## ขอบเขต

`quest.progression` เป็น generator ฝั่งผู้พัฒนาสำหรับวางโครงเรื่องต่อเนื่อง 100 แผนที่ โดยสร้าง **20 เควสต่อแผนที่** รวม 2,000 quest records พร้อม chapter, location, story beat, objective, reward และ prerequisite chain ข้อมูลนี้เป็น backend/content artifact ไม่ใช่ปุ่มสร้างเควสใน player UI

| กฎ | สิ่งที่ artifact บังคับ |
|---|---|
| Playable map | `obsidian-frontier` เป็น map ที่เล่นได้เพียงรายการแรก |
| Future maps | `story-map-002` ถึง `story-map-100` เป็น `planned` และ `runtimeImportAllowed: false` |
| Quest count | 20 เควสต่อ map; generator ไม่ยอมรับค่าต่ำกว่า 20 |
| Map gate | เควสแรกของ map ถัดไปต้องรอเควสทั้ง 20 ของ map ก่อนหน้า |
| Quest chain | เควสลำดับถัดไปต้องรอเควสก่อนหน้าใน map เดียวกัน |
| Detail uniqueness | quest ID, title และ story beat มีรายละเอียดผูกกับ map/order ไม่ซ้ำกันใน catalog ที่สร้าง |
| Rewards | ทุกเควสมี item/reputation และเควสสุดท้ายของแต่ละ map มี ability unlock metadata |

Generator ใช้ Common Generator Registry จึงมี schema/version, deterministic hash, seed provenance และ preview summary การ preview ของ `creator.quest` ส่งเฉพาะ summary กับตัวอย่าง 20 เควสแรก ไม่ส่ง block/world map ให้ player runtime และไม่มีเส้นทาง auto-import หรือ auto-unlock แผนที่อนาคต

## จุดใช้งาน

| จุดใช้งาน | หน้าที่ |
|---|---|
| `server/generators/questProgressionGenerator.ts` | story map, quest, objective, reward, prerequisite และ validator |
| `tools/quest-progression-generator.ts` | CLI `pnpm story:generate` สำหรับ export artifact |
| `server/creatorRouter.ts` | admin-only quest preview summary |
| `client/src/pages/CreatorDomainWorkbench.tsx` | panel ภาษาไทยสำหรับดูจำนวน map/quest/gate และตัวอย่างเควส |
| `server/questProgressionGenerator.test.ts` | count, uniqueness, gating, determinism และ future-map guard |

## สถานะที่ยังไม่เสร็จ

หน่วยนี้ยังไม่ใช่ player-facing story engine: ยังไม่มี authoritative quest state, map unlock persistence, 20 objective interactions ต่อ map, dialogue/cutscene system, ability grant transaction, save migration หรือ long-press item detail UX 3–5 วินาที การมี 2,000 records ใน generator จึงเป็นหลักฐานของ content foundation เท่านั้น ไม่ใช่หลักฐานว่า map 11–100 เล่นได้หรือปลดล็อกได้แล้ว
