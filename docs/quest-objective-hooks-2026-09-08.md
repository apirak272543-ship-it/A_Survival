# Quest objective hooks — 2026-09-08

เพิ่ม `ProgressionState::recordObjective` เป็น typed gameplay event API โดย event จะถูก route ไปยังทุก quest definition ที่มี objective type ตรงกัน และคืนค่าเมื่อ event ทำให้ quest ใด complete เป็นครั้งแรก

`GameMode::destroyBlock` ใช้ `QUEST_GATHER` เมื่อบล็อกถูกทำลายสำเร็จ และใช้ `QUEST_HARVEST` เมื่อ CropTile เป็น wheat ที่มี stage ถึง maxStage พร้อม discovery ของ Codex wheat การ route ไม่ผูก gameplay code กับ quest ID จึงสามารถเพิ่ม quest data ได้โดยไม่ต้องแก้ event pipeline

`QUEST_DEFEAT` มี typed route และ contract coverage แล้ว แต่การเชื่อมกับ combat death event จริงจะทำต่อใน combat integration milestone เนื่องจาก native entity lifecycle ยังไม่มี runtime progression owner ใน Level โดยตรง การตัดสินใจนี้หลีกเลี่ยง global state และยังคง cache-first invariant

ผลทดสอบ `progression_state_contract` ผ่าน และ Desktop/Web build/link ผ่านหลังการเปลี่ยนแปลง
