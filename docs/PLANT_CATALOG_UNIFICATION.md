# Plant Catalog Unification

## สถานะของหน่วยงาน

หน่วยนี้รวมมุมมองของระบบฟาร์มเข้ากับ `PLANT_CATALOG` ที่เป็น runtime source of truth ของ Obsidian Frontier โดยไม่สร้างชุด seed/harvest/soil/asset ใหม่ซ้ำ ระบบยังคงเป็น **Obsidian-only** และผลจาก generator นี้เป็นข้อมูลล่วงหน้าที่ถูกอ่านใน gameplay เท่านั้น ไม่ได้ generate ใน render loop

| ข้อมูล | Source of truth | มุมมองของฟาร์ม |
|---|---|---|
| Plant ID | `client/src/game/data/plantCatalog.ts` | `plant-001` ถึง `plant-300` |
| Seed ID | `PLANT_ITEMS` ใน catalog เดียวกัน | `seed-plant-001` ถึง `seed-plant-300` |
| Soil/biome | runtime plant definition | adapter ใช้ soil แรกและ map `obsidian-frontier` |
| Harvest item | `yieldItemId` ของ runtime plant | farm reward ใช้ item เดิมจาก `ALL_ITEMS` |
| Growth | `growthSeconds` ของ runtime plant | แปลงเป็น milliseconds สำหรับ offline state |
| Effect | runtime effect | รองรับเฉพาะ repellent/healing ที่ถูก cap ใน farm view; effect อื่นไม่ถูกยกระดับเป็น aura โดยอัตโนมัติ |

## Backward compatibility

ข้อมูลเก่าที่ใช้ `seed-###` ยังคง resolve ไปยัง plant ลำดับเดียวกัน และ `world-plant-###` ยังคงอ่านได้ในระหว่าง hydrate แต่ `normalizeWorldFarmState` จะเขียนค่ากลับเป็น canonical `plant-###` เพื่อไม่ให้ state ใหม่สร้าง ID รุ่นเก่าซ้ำ

การเปลี่ยนแปลงนี้ทำให้ผลผลิตของฟาร์มใช้ `yieldItemId` จาก runtime catalog จริง ตัวอย่าง plant แรกจึงให้ `material-002` ตาม runtime definition ไม่ใช่ค่า legacy `material-001` จาก generator view เดิม

## หลักฐานที่ตรวจแล้ว

| หลักฐาน | ผล |
|---|---|
| `server/plantCatalog.test.ts` | 300 runtime plants และ 300 seed items ผ่าน |
| `server/plantCatalogGenerator.test.ts` | adapter 300 รายการ, canonical seed/soil/harvest links และ effect caps ผ่าน |
| `server/worldFarming.test.ts` | seed aliases, growth stages, harvest และ capped repellent ผ่าน |
| `server/worldFarmSystem.test.ts` | planting, inventory consumption, canonical reward และ legacy state normalization ผ่าน |

ยังไม่อ้างว่า plant art ครบ 300 ชนิด, ecology simulation ครบทุก biome หรือ browser/device playtest เสร็จแล้ว เพราะ asset coverage, broader biome distribution และ real-device acceptance ยังเป็นงานต่อไปตาม `OWNER_REQUIREMENTS_MATRIX.md`
