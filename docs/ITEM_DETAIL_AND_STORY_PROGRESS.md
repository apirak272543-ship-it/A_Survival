# Item Detail และ Story Progress

## Item detail ใน player UI

Player Vault ใช้ข้อมูลจาก `ItemDefinition` และ `ItemInstance` เดิม ไม่สร้างสเตตัสใหม่ใน UI. การแตะสั้นยังเลือก item เพื่อดูแผงรายละเอียดด้านข้างและใช้ action เดิม ส่วนการกดค้างบน item เป็นเวลา `3,500 ms` จะเปิด Item Detail sheet แยก โดยแสดงชื่อ หมวด ระดับ stack limit enhancement item ID tags provenance และ effect รวมถึง block ที่วางได้ถ้ามี

เมื่อเปลี่ยน hotbar item ระบบแสดง short detail ผ่าน toast จาก definition จริง เช่นชื่อและ effect. ระบบยังไม่อ้างค่า attack damage ที่ไม่มีอยู่ใน canonical `ItemDefinition`; จะเพิ่มค่าสถานะดังกล่าวเมื่อ Universal Item/Combat runtime มี contract ที่รองรับ ไม่สร้างค่าปลอมเพื่อให้ UI ดูสมบูรณ์

| Interaction | ผลลัพธ์ | หลักฐาน |
|---|---|---|
| แตะสั้น Vault item | เลือก item และคง action เดิม | `server/itemDetailSystem.test.ts` และ browser DOM |
| กดค้าง 3.5 วินาที | เปิด full detail sheet | browser hold 3.6 วินาที เปิด `ITEM DETAIL · LONG PRESS 3.5S` |
| เปลี่ยน hotbar | แสดง short detail จาก canonical definition | browser DOM ตรวจ `เลือก Aether Blade 001 · ...` |
| item provenance | แสดง type/event เดิม ไม่สร้าง provenance ใหม่ | item detail test และ browser `starter/starter-1` |

## Story progress แบบ local-first

`storyProgressionSystem` เก็บ `completedQuestIds`, `completedMapIndex` และ `nextMapReadyIndex` ใน `LocalGameSession` ซึ่งถูกบันทึกผ่าน localStorage/IndexedDB owner เดิม. ค่าเก่าที่ไม่มี field นี้จะ normalize เป็น progress ว่าง และข้อมูล malformed/future-map จะถูกทิ้งโดยไม่ทำให้ map อนาคตกลายเป็น playable

ใน runtime contract ปัจจุบัน ผู้เล่นทำได้เฉพาะ sequential quest chain ของ `story-map-001` ซึ่งแทน `obsidian-frontier`. เมื่อครบ 20 เควส state จะบอกว่า map ถัดไปพร้อมเข้าสู่ขั้น progression แต่ `getRuntimeStoryMapId(2)` ยังคงคืน `null` และ future maps ยัง `planned`/`runtimeImportAllowed: false`. นี่เป็น intentional safety boundary; ยังไม่ใช่การเปิด map 2

## สิ่งที่ยังไม่อ้างว่าเสร็จ

ยังไม่มีการเชื่อม objective กับ block/farm/combat events จริง, authoritative reward/ability transaction, dialogue/cutscene, map unlock persistence ข้าม device, quest journal ที่อ่าน full story records ใน player UI หรือการเปิด future map runtime. `quest.progression` เป็น content generator หลังบ้านและ `creator.quest.preview` เป็น admin-only preview เท่านั้น

หลักฐาน browser ที่ตรวจได้จริงเก็บไว้ที่ [`docs/item-detail-browser-evidence-2026-08-27.md`](./item-detail-browser-evidence-2026-08-27.md) และผล automated validation ล่าสุดก่อน browser smoke คือ `64` test files / `250` tests, `pnpm check` และ production build ผ่าน โดย build warning analytics placeholders/Babylon vendor chunk ยังคงอยู่ตามเดิม ไม่ใช่หลักฐาน real-device performance
