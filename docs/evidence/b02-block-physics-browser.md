# B-02 block physics browser smoke

วันที่ตรวจ: 2026-08-27

Browser sandbox เปิดเส้นทาง player ของ A_Survival จาก landing ผ่าน identity ด้วย Player ID ชั่วคราว `B02PhysicsProof`, lobby และ map selector แล้วเลือกเฉพาะ `Obsidian Frontier` จาก cache/local slice. หน้า game แสดง canvas, health/ether/stamina HUD, touch stick, action cluster, quick slots, block interaction button, footer และปุ่ม In-map Settings ใน player route จริง. ไม่มี creator workbench หรือ developer control ปรากฏในเส้นทางนี้ และ map selector ระบุว่าแผนที่อื่นยังเป็นข้อมูลแผนงานหลังบ้าน ไม่เปิดให้เลือกหรือเตรียม cache ใน runtime.

การตรวจนี้เป็น **browser smoke ของ player boundary และ Obsidian-only route** ไม่ใช่ authenticated E2E, real-device acceptance หรือการยืนยันว่า browser สามารถจัดตำแหน่งผู้เล่นชน cactus ได้อย่าง deterministic. Semantics ของ partial/solid occupancy, non-solid pass-through, cactus hazard contact และ cooldown ถูกยืนยันด้วย focused unit tests ใน `server/blockPhysicsSystem.test.ts` จำนวน 6 tests. Browser evidence ไม่ได้อ้าง damage event หรือ persistence ที่ไม่ได้สังเกตโดยตรง.

ภาพ browser ที่เกี่ยวข้อง:

- `/home/ubuntu/screenshots/localhost_2026-08-27_15-55-35_5482.webp` — Obsidian Frontier player HUD/control route.

Implementation checkpoint: `2998e34` (`test: cover block physics boundaries`).
