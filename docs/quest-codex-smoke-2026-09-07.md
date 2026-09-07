# Quest/Codex runtime smoke — 2026-09-07

Web artifact รุ่นที่เพิ่ม `ProgressionState` ผ่าน username → Start Game → Select world → Create Expedition → Begin และเข้า gameplay ได้จริง จากนั้นกด Escape เปิด Game menu พบข้อความ runtime `Quest: frontier_arrival 0/8` แสดงเหนือเมนู ป้าย Codex ถูกเพิ่มใน render path เดียวกันและ build ผ่านแล้ว

การทดสอบนี้ยืนยันว่า registry ถูกอ่านผ่าน state owner ของ Minecraft และ UI อ่าน state แบบ read-only ใน PauseScreen โดยไม่สร้าง registry ใหม่ระหว่าง render.
