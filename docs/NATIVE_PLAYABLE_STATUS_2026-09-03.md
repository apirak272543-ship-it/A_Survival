# Native Playable Status

วันที่ตรวจ: 2026-09-03
Branch: `native-base/mcpe`

## ผลที่พิสูจน์แล้ว

| การตรวจ | ผล |
|---|---|
| Obsidian runtime identity contract | PASS |
| Inventory 40 ช่อง / stack 64 contract | PASS |
| Plant registry lookup/validation | PASS |
| Performance profile ordering | PASS |
| Native CMake/Ninja build | PASS |
| Executable startup ภายใต้ Xvfb 8 วินาที | Process อยู่ครบจน timeout (`124`); ไม่พบ crash log |
| Git branch/remote | clean และตรงกับ `origin/native-base/mcpe` |

ชุด contract tests ถูก compile และ run แยกจาก renderer เพื่อยืนยัน invariant สำคัญโดย deterministic ส่วน native executable ถูกเปิดภายใต้ virtual display เพื่อทดสอบ startup/render loop เบื้องต้น รหัส timeout `124` เป็นผลจากการหยุดตามเวลาที่ตั้งไว้ ไม่ใช่ผลจาก assertion หรือ linker failure

## สิ่งที่รวมอยู่ใน native checkpoint

Native base มี runtime map identity `obsidian-frontier`, ปฏิเสธ empty level id ก่อน allocate level, namespace log ของ level, UI start/create expedition ที่ปรับบริบท Obsidian, inventory capacity contract, immutable plant registry และ performance profile data สำหรับ low/balanced/high

## สิ่งที่ยังไม่ควรประกาศว่าเสร็จ

ยังไม่มีหลักฐาน automated หรือ interactive ที่ยืนยันการกดปุ่มจาก start menu ไป world selection ไปสร้าง expedition และเข้า gameplay ครบเส้นทางบน native executable ยังไม่ได้เชื่อม plant registry เข้ากับ crop tile lifecycle จริง, ยังไม่มี quest/map progression, Codex, asset replacement, localization ไทยเต็มระบบ, mobile touch validation และ Web/Emscripten artifact ที่ผ่านการทดสอบ

ดังนั้นสถานะปัจจุบันคือ **native foundation และ contracts ผ่านการตรวจ พร้อมใช้เป็น vertical-slice base** แต่ยังไม่ใช่ release ที่ประกาศว่า A_Survival/Obsidian Frontier พร้อมเล่นเต็มระบบ
