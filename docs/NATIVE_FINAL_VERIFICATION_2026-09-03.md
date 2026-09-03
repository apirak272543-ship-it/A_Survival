# Native Final Verification Checkpoint

วันที่ตรวจ: 2026-09-03
Branch: `native-base/mcpe`

## ผลการตรวจล่าสุด

| รายการ | ผล |
|---|---|
| Obsidian runtime contract | PASS |
| Inventory 40 ช่อง / stack 64 | PASS |
| Plant registry | PASS |
| Performance profiles | PASS |
| Quest/map progression | PASS |
| Discovery-gated Codex registry | PASS |
| Native CMake/Ninja build | PASS |
| Xvfb startup/render smoke | Process อยู่ครบ 8 วินาทีจน timeout `124`; ไม่พบ crash output |
| Emscripten toolchain ใน sandbox | UNAVAILABLE (`emcmake` ไม่พบ) |
| Git branch/remote | clean และตรงกับ `origin/native-base/mcpe` |

การตรวจชุดนี้ยืนยัน contract และ build/link ของ native modules ทุกตัว รวมทั้งยืนยันว่า executable เริ่มทำงานภายใต้ virtual display ได้ตามเวลาทดสอบ การหมดเวลา `124` เป็นการหยุดโดยคำสั่งทดสอบ ไม่ใช่ผลจาก assertion หรือ crash

## สิ่งที่ checkpoint นี้ยังไม่ยืนยัน

ยังไม่มี automated input driver ที่กด start menu, create expedition และตรวจการเข้า gameplay ครบเส้นทาง จึงยังไม่ประกาศว่า native vertical slice เล่นผ่านแบบ end-to-end แล้ว นอกจากนี้ plant registry, quest registry และ Codex registry ยังเป็น contracts/registries ที่พร้อมให้ screen และ gameplay systems เชื่อมต่อ ไม่ใช่ระบบ UI/gameplay เต็มรูปแบบทั้งหมด

Web/Emscripten artifact ยังตรวจไม่ได้ใน sandbox นี้เพราะไม่มี Emscripten toolchain ต้องใช้ environment ที่ติดตั้ง Emscripten หรือ CI ที่เหมาะสมในการตรวจต่อ
