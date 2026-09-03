# A_Survival Release Readiness

วันที่ตรวจ: 2026-09-03
Branch: `native-base/mcpe`

## สถานะที่พิสูจน์แล้ว

| ขอบเขต | สถานะ | หลักฐาน |
|---|---|---|
| Native Desktop configure/build | PASS | CMake/Ninja สร้าง `build-native/MinecraftPE` |
| Native contract suite | PASS | runtime, inventory, plant, performance, quest และ Codex tests |
| Native startup/render smoke | PASS | Xvfb process อยู่ครบเวลาทดสอบโดยไม่มี crash output |
| Obsidian identity | PASS | canonical id `obsidian-frontier` และ fail-closed startup check |
| Native inventory contract | PASS | 40 slots, stack cap 64 |
| Native plant lifecycle boundary | PASS | cached registry และ crop stage bounds |
| Native quest/map contract | PASS | sequential unlock definition |
| Native Codex contract | PASS | short/full description ตาม discovery state |
| Web/Emscripten configure/build | PASS | สร้าง `MinecraftPE.js`, `.wasm`, `.data` |
| Web browser load | PASS | Chromium โหลดถึง username screen และ render loop ประมาณ 40–50 FPS |
| Web username/world transition | UNVERIFIED | legacy canvas input path ยังไม่ผ่าน automation assertion |
| Mobile device validation | UNVERIFIED | มี touch-safe-area code แต่ยังไม่ได้ทดสอบบนอุปกรณ์จริง |

## สิ่งที่พร้อมทดลอง

สามารถทดลอง native Desktop executable ได้จาก `build-native/MinecraftPE` ใน environment ที่มี display หรือใช้ Xvfb สำหรับ startup smoke สามารถทดลอง Web artifact ผ่าน HTTP โดยใช้ `tools/serve_web_artifact.py` จาก root ของ repository แล้วเปิด `http://localhost:4173/`

## สิ่งที่ยังไม่ควรเรียกว่า release เต็มรูปแบบ

ระบบ registry และ contracts ที่เพิ่มเข้ามายังต้องเชื่อมกับ gameplay screens และ persistence ครบวงจร ระบบ quest/Codex ยังไม่ใช่ UI เต็มรูปแบบ และ Web browser automation ยังผ่านเพียงการโหลด runtime/username screen ไม่ใช่การสร้าง expedition จนเข้า world สำเร็จ นอกจากนี้ Emscripten build ใช้ Web mode ที่ปิด sound/network และมี legacy warnings ที่ควรจัดการก่อน release production

Checkpoint ล่าสุด: `7218de9` ก่อนเอกสารฉบับนี้ หากมีการ commit เอกสารนี้แล้ว ให้ใช้ commit ใหม่ล่าสุดเป็น release-readiness documentation checkpoint
