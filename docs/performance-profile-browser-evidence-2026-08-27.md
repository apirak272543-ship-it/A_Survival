# Performance profile browser evidence — 2026-08-27

หลัง production build และ local dev server เปิดสำเร็จ หน้า player landing render จริงโดยแสดง `ARCANE FRONTIER` และไม่มี Creator Studio/Workbench controls.

เมื่อเปิด Global Settings จาก player landing พบ select ภาษาไทย `โปรไฟล์ประสิทธิภาพ` พร้อมตัวเลือก `ประหยัดอุปกรณ์`, `สมดุล`, `คุณภาพสูง`. หน้าจอยังคงมี render-distance, camera, visual quality, effect intensity, touch และ reduced-motion controls เดิม. นี่เป็น explicit user preference ที่ถูก persist ผ่าน GameSettings ไม่ใช่ auto-detected device benchmark และไม่ใช่หลักฐาน real-device FPS/memory/thermal acceptance.

## Persisted selection observation

ใน Global Settings เลือก `ประหยัดอุปกรณ์` ได้จริงจาก select ภาษาไทย และ label เปลี่ยนจาก `สมดุล` เป็น `ประหยัดอุปกรณ์`. หลังปิด settings หน้า player landing กลับมาได้ปกติ. ยังต้องเข้า Obsidian game route เพื่อตรวจ runtime data attributes ของ budget ที่คำนวณจริง; ยังไม่อ้าง device benchmark.

## Low-tier flow observation

หลังเลือก `ประหยัดอุปกรณ์` แล้วปิด settings สามารถกลับเข้า identity flow ได้ปกติ และกรอก Player ID ทดลอง `PerfProof` ได้. ยังไม่อ้าง runtime tier จนกว่าจะยืนยัน game DOM attributes หลังเข้า Obsidian.

## Low-tier map flow

หลังยืนยัน Player ID `PerfProof` และกดออกสำรวจ map selector ยังแสดงเฉพาะ `Obsidian Frontier`, สถานะเล่นได้ตอนนี้, รัศมี `500m` และ footnote ปิด future maps/cache. การเลือก performance tier ไม่ได้ bypass Obsidian-only guard.

## Low-tier runtime metadata evidence

เข้า `Obsidian Frontier` แล้วอ่าน `.game-screen` data attributes ได้จริง: `tier: low`, `viewDistanceBlocks: 15`, `mobSimulationRadius: 24`, `animationRadius: 24`, `physicsRadius: 16`, `hasCanvas: true`, `creatorControls: false`. `targetFps` ยังแสดงค่าผู้ใช้ใน-map `60`; runtime render loop ใช้ tier ceiling `maxTargetFps: 30` ผ่าน `GameCanvas` budget ref. ข้อนี้เป็นหลักฐาน policy wiring/DOM metadata ไม่ใช่การวัด FPS จริงบนอุปกรณ์.

## Direct-route observation

หลัง HMR และ production build ตรวจ `http://localhost:3000/game?mapId=obsidian-frontier` แล้วแอปนำกลับหน้า landing แทนการเปิด game โดยตรง. จึงยืนยันได้เพียงว่า direct path ไม่ bypass flow/guard ในสถานะนี้ และ **ยังไม่อ้าง** data attributes จาก direct URL; runtime metadata ต้องตรวจหลังเข้า game ผ่าน player flow.

## Flow retry note

การ automate flow สองรอบหยุดก่อนกรอกชื่อ แม้ browser view จะแสดงช่อง `e.g. NovaRider`; execution context ไม่พบ selector/input ในช่วงที่ script รัน. ไม่มีการเรียก API ภายนอกหรือการแก้ไข repository จากขั้นตอนนี้. จึงไม่นับเป็น evidence ใหม่ และต้องใช้ browser field interaction ตาม element index หากต้องทดสอบ effective FPS attribute เพิ่ม.

## Identity flow retry evidence

ใช้ browser field interaction ตาม element index กรอก `PerfAfterPatch` และยืนยันได้จริง; player hub แสดง `PerfAfterPatch` และปุ่ม `ออกสำรวจ เลือกแผนที่` พร้อมใช้งาน. นี่เป็นหลักฐานว่า player local-first flow ยังทำงานหลัง performance patch.

## Latest map-entry evidence

จาก player hub กด `ออกสำรวจ เลือกแผนที่` แล้ว map selector แสดงเฉพาะ Obsidian Frontier พร้อมข้อความ `OBSIDIAN VERTICAL SLICE · เล่นได้ตอนนี้`, `รัศมี 500m` และคำอธิบายว่า future maps ยังเป็นข้อมูลหลังบ้านและไม่เปิดให้เลือก/cache. จากนั้นกด `เข้าเล่นจากแคช` แล้วหน้า game แสดง Babylon canvas จริง, HUD, hotbar และสถานะ `8 ศัตรู`; ยังไม่สรุป FPS จริงจากภาพนี้.

## Effective FPS metadata verification

หลังเข้า game ผ่าน player flow ล่าสุดและอ่าน `.game-screen` ได้จริง: `tier: balanced`, `requestedTargetFps: 60`, `effectiveTargetFps: 60`, `viewDistanceBlocks: 20`, `mobSimulationRadius: 40`, `animationRadius: 48`, `physicsRadius: 32`, `hasCanvas: true`, `creatorControls: false`. ค่านี้เป็น profile `balanced` ของ Player ID ใหม่ `PerfAfterPatch` ซึ่งใช้ค่า default; เป็นหลักฐานว่า snapshot/UI wiring ของ effective target FPS ทำงาน. หลักฐาน `low` ของ Player ID `PerfProof` อยู่ในหัวข้อก่อนหน้า และไม่ควรนำค่าของสองโปรไฟล์มาปนกัน.

## Browser retry limitation

การ automate flow บางรอบหยุดก่อนกรอกชื่อเพราะ execution context ไม่พบ selector/input ในช่วง transition แม้ browser view จะแสดงช่องจริง. ไม่มีการเรียก API ภายนอกหรือการแก้ไข repository จากขั้นตอนนั้น. การทดสอบหลักฐานล่าสุดใช้ browser field interaction ตาม element index และผ่านถึง game แล้ว.
