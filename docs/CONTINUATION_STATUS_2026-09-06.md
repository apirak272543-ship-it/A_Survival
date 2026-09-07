# A_Survival / Obsidian Frontier — สถานะงานต่อเนื่อง

## ผลลัพธ์ที่ยืนยันแล้ว

เส้นทาง Web ตั้งแต่ username, Start Game, Select world, Create Expedition และ Begin สามารถเข้า gameplay ได้จริงใน Chromium โดย world generation ไม่ค้างหน้า Loading อีกต่อไป การแก้ไขใช้ synchronous generation เฉพาะ Emscripten และลด `CHUNK_CACHE_WIDTH` เฉพาะ Web เหลือ 4 chunks เพื่อให้ first-world generation เหมาะกับ browser prototype ขณะที่ Desktop ยังใช้ cache width 16 และ threaded generation ตามเดิม

ระบบ persistence ผ่าน Emscripten IDBFS ถูกตรวจจาก runtime จริง พบว่า `/games` ถูก mount เป็น IDBFS และโลก `New expedition` สร้างไฟล์ `chunks.dat`, `entities.dat`, `level.dat_old` และ `level.dat` หลังออกจากโลกแล้วกลับเข้า Select world รายการโลกยังปรากฏพร้อม preview, timestamp, Survival mode และรายละเอียดครบ

การเชื่อม gameplay กับ PlantRegistry ได้เพิ่มขึ้นอีกหนึ่งจุด โดย `CropTile::getResource` อ่าน `wheat.maxStage` จาก immutable registry แทน hardcode ค่า 7 ส่วน contract test เพิ่ม assertion สำหรับ wheat stage 7 และ emberroot stage 5 แล้วผ่าน

หน้าจอ touch/mobile ของ Select World และ Create Expedition ถูกปรับ safe-area margin 8px ให้ปุ่ม Back, Create new, header และ Begin ไม่ชิดขอบ viewport หรือ system gesture area การทดสอบ browser screenshot ยืนยันว่าเส้นทางเดิมยังใช้งานได้หลังปรับ layout

## การทดสอบที่ผ่าน

| รายการ | ผล |
|---|---|
| Web CMake configure/build/link | PASS |
| Desktop CMake build/link | PASS |
| Web username → Start Game | PASS |
| Select world → Create Expedition ผ่าน Enter | PASS |
| Begin → playable terrain/gameplay | PASS |
| IDBFS world files | PASS |
| Save → Quit to title → world list reload | PASS |
| codex registry contract | PASS |
| inventory 40/64 contract | PASS |
| obsidian runtime contract | PASS |
| performance profile contract | PASS |
| plant registry contract | PASS |
| quest progression contract | PASS |
| Desktop Xvfb startup smoke | PASS |

## Git

งานถูก commit และ push ไปยัง `origin/native-base/mcpe` แล้ว โดย commit ล่าสุดคือ `cb0899f fix: add touch safe areas to expedition screens` สถานะ repository หลัง regression เป็น clean และ branch ตรงกับ remote

## งานที่ยังควรทำต่อ

Quest/Codex ยังมี registry contract แต่ยังไม่มีหน้าจอ gameplay เต็มรูปแบบ งานต่อไปที่เหมาะสมคือทำ read-only hooks สำหรับ quest progression และ Codex discovery ใน HUD/menu โดยคงหลัก cache-first และไม่คำนวณ registry ซ้ำใน runtime นอกจากนี้ควรเพิ่ม browser test แยกสำหรับการโหลดโลกเดิมกลับเข้า gameplay และทดสอบ viewport แนวตั้ง/อัตราส่วนมือถือเพิ่มเติม
