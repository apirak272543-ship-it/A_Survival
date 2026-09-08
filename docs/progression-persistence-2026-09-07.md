# Progression persistence — 2026-09-07

`ProgressionState` รองรับการเขียนและอ่าน NBT แบบ optional compound ชื่อ `ObsidianProgression` ภายใน `level.dat` โดยเก็บ version, quest progress แบบ indexed key และ codex discovery แบบ indexed key การอ่านจะ reset เป็นค่าเริ่มต้นก่อน แล้ว clamp progress ให้อยู่ระหว่างศูนย์กับ target ของ registry จึงรองรับ level.dat เก่าที่ไม่มี compound นี้และป้องกันค่าที่เสียหายเกินขอบเขต

`LevelData` เป็นเจ้าของ serialized progression state ส่วน `Minecraft` sync state เข้า LevelData ตอนโหลดโลก และ sync กลับก่อน save ตอนออกจากโลก การ sync เกิดเฉพาะ lifecycle save/load ไม่เกิดทุก frame จึงยังตรงกับหลัก Generate Once, Reuse Always

ผลทดสอบ: contract registry เดิมทั้ง 6 รายการผ่าน, `progression_state_contract` พร้อม NBT round-trip ผ่าน, Desktop build/link ผ่าน และ Web Emscripten build/link ผ่าน artifact พร้อมใช้งาน

## Web end-to-end evidence

หลังสร้างโลกใน Web build ล่าสุดแล้วกด Quit to title พบใน Emscripten FS ว่า `New expedition/level.dat` มีขนาด 1152 bytes และค้นพบ marker `ObsidianProgression` กับ `Quest_0` ในข้อมูล NBT หลัง save จากนั้นกลับเข้า Select world พบโลกเดิมพร้อม preview, timestamp และ Survival mode จึงยืนยันเส้นทาง create → save → list reload ใน browser ได้จริง

## Reload result

หลังกลับเข้า Select world พบ `New expedition` พร้อม preview และรายละเอียดเดิม การคลิก world card โหลดกลับเข้า gameplay ได้จริงอีกครั้ง จึงปิดเส้นทาง create → save → list reload → load gameplay ใน browser ได้ครบ
