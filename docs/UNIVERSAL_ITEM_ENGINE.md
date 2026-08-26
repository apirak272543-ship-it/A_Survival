# A_Survival Universal Item Engine

**สถานะ:** backend/data foundation checkpoint — ยังไม่เชื่อม player-facing editor และยังไม่แทนที่ runtime catalog เดิม

Universal Item Engine แก้ปัญหา content explosion ด้วยการสร้าง item จาก `purpose → identity → role → material → environment → progression → power budget → trade-off → synergy/compatibility → counter` แทนการสุ่มชื่อกับ damage แยกขาดจากโลก. Definition จึงต้องมี resource links, recommended builds, repair profile, effect limits และ performance cost ก่อนผ่าน validator

## Contract

แต่ละ item มี family, category, role, material/environment tags, progression, element/damage type, purpose, identity, weakness, counters, stats, effects, durability, repair resources, compatibility rules, recommended builds และ performance cost. Weapon family ถูกบังคับให้มี identity และ trade-off ที่เหมาะสม; tool ไม่สามารถกลายเป็นอาวุธหลักโดยอัตโนมัติ; item ที่ power สูงหลายแกนโดยไม่มีข้อจำกัดจะถูก reject

Balance profile คำนวณ `powerScore`, `utilityScore`, `costScore`, `riskScore`, `rarityScore`, `synergyScore` และ `totalScore` ภายใต้ cap 100. Effects ต้องมี duration, strength, stack limit, cooldown และ counter tags โดย stack limit สูงสุด 5. Compatibility ใช้ผล `allowed`, `restricted`, `forbidden` หรือ `special` และ tag matching เพื่อควบคุม combinations เช่น plant → potion/enchant ได้ แต่ไม่สร้างการจับคู่ที่ไม่มีเหตุผล

## Resource and maintenance loop

Item ต้องอ้าง resource จาก world source เช่น mining, plant, mob, farming, structure, dungeon หรือ boss. Repair profile อ้าง resource และวิธีซ่อมที่สัมพันธ์กับ family/โลก เพื่อรองรับ loop `use → durability ลด → repair → resource demand → exploration/farming/mining`. Checkpoint นี้เป็น schema/validator เท่านั้น ยังไม่มี crafting station, repair transaction, economy runtime หรือ cross-system simulation

## Generate once และขอบเขต runtime

Plugin `item.universal` ใช้ Common Generator Registry ทำ deterministic artifact, validation และ preview. ไม่มี route หรือ UI ให้ผู้เล่นกดสร้าง item และไม่มีการ generate ใน Babylon render loop. ระบบนี้ยังไม่ทำ armor set, enchant/socket/upgrade transactions, full plant relationship graph, dungeon loot, server-authoritative economy หรือ migration ของ `client/src/game/data/catalog.ts`; งานเหล่านั้นเป็น checkpoints แยก

## หลักฐาน

- Implementation: [`server/generators/universalItemEngine.ts`](../server/generators/universalItemEngine.ts)
- Tests: [`server/universalItemEngine.test.ts`](../server/universalItemEngine.test.ts)
- Common artifact boundary: [`server/generators/commonGeneratorApi.ts`](../server/generators/commonGeneratorApi.ts)
- Content catalog: [`CONTENT_CATALOG_GENERATOR.md`](./CONTENT_CATALOG_GENERATOR.md)
- Requirements matrix: [`OWNER_REQUIREMENTS_MATRIX.md`](./OWNER_REQUIREMENTS_MATRIX.md)
