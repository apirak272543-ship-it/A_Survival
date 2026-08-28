# แผนผสานแนวคิด MCPE เข้ากับ A Survival

เอกสารนี้กำหนดขอบเขตการนำแนวคิดเชิงสถาปัตยกรรมจาก MCPE มาใช้กับ A Survival โดยไม่คัดลอก source code, asset, identifier, branding หรือ binary ใด ๆ จากโครงการต้นทาง เนื่องจากการตรวจ repository audit พบว่า MCPE ไม่ได้ประกาศ license ระดับ repository และมีเนื้อหาอ้างอิง Minecraft PE โดยตรง

## หลักการตัดสินใจ

A Survival จะคง canonical contract, asset manifest, Obsidian-only runtime gate, offline persistence และ Babylon.js web stack ของตัวเองไว้ทั้งหมด ส่วนที่นำมาปรับใช้ได้คือการแยกขอบเขตของระบบและแนวคิดด้าน lifecycle ได้แก่ world/chunk, entity simulation, inventory, physics, renderer, dirty/visibility update และการแยก fixed simulation tick ออกจาก render frame

| แนวคิดอ้างอิง | จุดเชื่อมใน A Survival | วิธีใช้งานรอบนี้ |
|---|---|---|
| World/level/chunk lifecycle | `visibleRegionSystem.ts`, `scene.ts` | เพิ่ม bounded chunk lifecycle diff เพื่อรายงาน activate/deactivate และไม่สร้างโลกใน render loop |
| Dirty-region / priority rendering | block-world overrides และ terrain visibility | ใช้ชุด chunk ที่เปลี่ยนแปลงเพื่อกำกับ visibility metadata; ยังไม่ port renderer ของต้นทาง |
| Entity simulation แยกจาก renderer | `scene.ts` และ encounter objects | เพิ่ม fixed tick scheduler แบบ deterministic สำหรับงาน simulation ที่ไม่ควรผูกกับจำนวน render frames |
| Inventory/container domain | `inventorySystem.ts`, `worldStorageSystem.ts` | คง canonical 40-slot carry / 27-slot chest และ provenance เดิม ไม่ใช้รูปแบบข้อมูลจากต้นทาง |
| AABB/collision concept | `blockPhysicsSystem.ts` | คง implementation TypeScript ของ A Survival และเพิ่ม guard/test เท่านั้น |
| Platform/touch abstraction | `mobileViewportPolicy.ts`, touch HUD | ใช้เป็น design reference ไม่ port native Android/iOS/GLFW code |

## Vertical slice รอบนี้

รอบนี้จะเพิ่ม `runtimeTickSystem.ts` เป็น pure, bounded scheduler สำหรับ fixed simulation tick ที่ 20 Hz พร้อม maximum catch-up 4 ticks ต่อ render frame และตัวนับ dropped ticks เมื่อเครื่องช้าหรือ tab ถูกพัก นอกจากนี้จะเพิ่ม `chunkLifecycleSystem.ts` เพื่อคำนวณ set difference ของ visible chunks แบบไม่กลายพันธุ์ข้อมูล และเชื่อม metadata เข้ากับ runtime scene เพื่อให้ตรวจสอบได้ว่า chunk ใดถูกเปิด/ปิดโดยระบบ visibility

การเปลี่ยนแปลงนี้ไม่เปิด generator หรือ editor ให้ผู้เล่น ไม่เพิ่ม future-map runtime entry ไม่แตะ asset จาก MCPE และไม่เปลี่ยนกติกา Obsidian Frontier ที่เป็นแผนที่เล่นได้เพียงแผนที่เดียว

## Acceptance criteria

1. TypeScript type-check ผ่านโดยไม่มี error ใหม่
2. ชุดทดสอบเดิมทั้งหมดผ่าน และมี focused tests สำหรับ tick scheduler กับ chunk lifecycle อย่างน้อย 8 กรณี
3. Scheduler ปฏิเสธหรือ clamp ค่า non-finite, ค่าติดลบ และ delta ที่ใหญ่เกินขอบเขต พร้อม bounded loop
4. Chunk lifecycle คำนวณ activated/deactivated/retained อย่าง deterministic และคืนค่าเป็นชุดใหม่
5. Runtime scene แสดง metadata ของ tick/chunk lifecycle เพื่อ QA ได้ โดยไม่เผยเครื่องมือ generator ให้ผู้เล่น
6. ไม่มีไฟล์หรือ asset ที่นำเข้าจาก MCPE โดยตรง

## ผลที่ยังไม่อ้างว่าเสร็จ

การผสานนี้ไม่ใช่การ port MCPE ทั้งระบบ ไม่ใช่หลักฐาน mobile-device FPS, chunk streaming บนเครื่องจริง, network multiplayer, native platform layer หรือ complete combat/quest progression จนกว่าจะมี implementation และ acceptance แยกต่างหาก

## References

[1]: https://github.com/Endlad2/MCPE "Endlad2/MCPE repository"
[2]: https://gitea.sffempire.ru/Kolyah35/minecraft-pe-0.6.1 "Upstream Gitea repository linked from README"
[3]: ./research/mcpe-repository-audit-2026-08-28.md "A Survival MCPE repository audit"
[4]: ./OWNER_REQUIREMENTS_MATRIX.md "A Survival owner requirements matrix"
