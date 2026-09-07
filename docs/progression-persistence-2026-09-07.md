# Progression persistence — 2026-09-07

`ProgressionState` รองรับการเขียนและอ่าน NBT แบบ optional compound ชื่อ `ObsidianProgression` ภายใน `level.dat` โดยเก็บ version, quest progress แบบ indexed key และ codex discovery แบบ indexed key การอ่านจะ reset เป็นค่าเริ่มต้นก่อน แล้ว clamp progress ให้อยู่ระหว่างศูนย์กับ target ของ registry จึงรองรับ level.dat เก่าที่ไม่มี compound นี้และป้องกันค่าที่เสียหายเกินขอบเขต

`LevelData` เป็นเจ้าของ serialized progression state ส่วน `Minecraft` sync state เข้า LevelData ตอนโหลดโลก และ sync กลับก่อน save ตอนออกจากโลก การ sync เกิดเฉพาะ lifecycle save/load ไม่เกิดทุก frame จึงยังตรงกับหลัก Generate Once, Reuse Always

ผลทดสอบ: contract registry เดิมทั้ง 6 รายการผ่าน, `progression_state_contract` พร้อม NBT round-trip ผ่าน, Desktop build/link ผ่าน และ Web Emscripten build/link ผ่าน artifact พร้อมใช้งาน
