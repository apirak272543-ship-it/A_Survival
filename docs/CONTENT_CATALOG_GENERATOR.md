# A_Survival Content Catalog Generator

**สถานะ:** backend/data tool checkpoint — generate once, validate, registry/export; ยังไม่เปิดให้ผู้เล่นเรียกใช้

Content Catalog Generator ใช้ Common Generator API สร้าง definitions แบบ deterministic สำหรับคลัง content ในอนาคต โดยกำหนดขั้นต่ำ **300 definitions ต่อ category** และไม่สร้างข้อมูลใหม่ใน render loop. Checkpoint นี้รองรับ 10 categories ได้แก่ `weapon-sword`, `weapon-bow`, `weapon-ranged`, `plant`, `seed`, `material`, `furniture`, `decoration`, `structure` และ `tool` จึงรองรับอย่างน้อย 3,000 definitions เมื่อเรียกด้วย default input

## Data ที่สร้าง

แต่ละ definition มี logical id, category, ordinal, display name, tier, stack limit, equippable flag, tags, effect และ logical asset ID. Plant/seed definitions ผูก `soilAffinity` กับชุดดินห้าแบบที่ใช้เป็น metadata สำหรับ ecosystem ต่อไป. Weapon definitions มี `baseDamage`, `reach` และ `attackSpeed` เพื่อเป็น combat metadata สำหรับ item engine ต่อไป ไม่ได้อ้างว่าเป็น combat balance ที่ผ่าน playtest แล้ว

Tier distribution, stack rules และ asset namespace ถูกกำหนดเป็นข้อมูลล่วงหน้า. Weapon/tool เป็น single-instance (`stackLimit: 1`), structure ใช้ stack 64 ตาม block convention และ content อื่นรองรับ stack 99 ใน catalog foundation. ค่าดังกล่าวเป็น generator data contract แยกจาก current runtime catalog เพื่อไม่ทำให้ farming/block/chest slice เปลี่ยนโดยไม่ผ่าน migration และ gameplay tests

## Validation และ provenance

Input ตรวจหมวดไม่ซ้ำ, category ที่รองรับ, จำนวน 300–400 ต่อหมวด และ lowercase asset namespace. Output ตรวจ schema, unique IDs, category counts, ordinal, asset ID, weapon combat metadata, plant/seed soil affinity, equippable stack rule และ unique asset references. Asset refs ใช้ logical IDs เช่น `a-survival.content.weapon-sword` และ `starter-authored` source พร้อม `ASSETS.md#logical-content-pack` provenance reference; ยังไม่ใช่ texture/model จริง

Generator เชื่อม `CommonGeneratorRegistry` ผ่าน plugin `content.catalog` version `1.0.0`. Artifact มี deterministic SHA-256 content hash, preview summary, save/export validation และ seed provenance. Seed เดียวกันกับ input เดียวกันให้ output/hash เดิม แม้ `generatedAt` ต่างกัน

## ขอบเขตที่ยังไม่เสร็จ

Checkpoint นี้มี starter texture pack แยกที่ `client/public/assets/packs/a-survival-content-library-v0-1/` จำนวน 16 PNG สำหรับ terrain, plant, weapon และ material พร้อม manifest/digest/provenance; ยังไม่มี texture/model/atlas ครบตาม definitions 3,000 รายการ และยังไม่มี final art coverage หรือ asset upload ภายนอก. ยังไม่มี universal item/equipment/combat/crafting/economy engine, plant growth ecology, procedural animation, Codex, credits หรือ player-facing content editor. Logical asset references ที่เหลือจะถูกนำไปผูกกับ asset pack เมื่อถึง visual/asset phase และต้องผ่าน provenance, validation, cache และ performance review ก่อน runtime ใช้จริง

Current `client/src/game/data/catalog.ts` ยังเป็น runtime catalog owner ของ gameplay slice และไม่ได้ถูกแทนที่ด้วย catalog generator ใน checkpoint เดียวกัน

## หลักฐาน

- Implementation: [`server/generators/contentCatalogGenerator.ts`](../server/generators/contentCatalogGenerator.ts)
- Tests: [`server/contentCatalogGenerator.test.ts`](../server/contentCatalogGenerator.test.ts)
- Shared artifact contract: [`server/generators/commonGeneratorApi.ts`](../server/generators/commonGeneratorApi.ts)
- Asset boundary: [`../ASSETS.md`](../ASSETS.md)
- Requirements matrix: [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md)


## Stored snapshot

รัน `server/generators/generateContentSnapshot.ts` แล้วเก็บ artifact ที่ `server/generators/generated/content-catalog-min-300.json` ขนาดประมาณ 1.1 MB มี 3,000 definitions จาก 10 categories และ 10 logical asset references. Snapshot ใช้ seed `content-library-min-300-v1` และ SHA-256 content hash `76bc5d5001a0153ce3007b1a909f181409a9ce8cf2c5fba2534e857bf7a0bcfa`; `server/contentCatalogSnapshot.test.ts` โหลดไฟล์กลับมา validate และตรวจ hash ก่อน reuse

Snapshot นี้เป็น data artifact สำหรับ backend/tool workflow เท่านั้น ไม่ได้ถูก import เข้า Babylon runtime และยังไม่ใช่หลักฐานว่ามี texture/model จริงครบ 3,000 รายการ
