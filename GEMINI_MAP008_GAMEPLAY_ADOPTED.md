# MAP_008 Ancient Obsidian Ruins — แนวทาง Gemini ที่นำมาใช้

MAP_008 ใช้ **Defense Sweep** แบบ deterministic ซึ่งสร้างความเสียหาย laser ต่อเนื่องเฉพาะเมื่อผู้เล่นอยู่นอก Rune Terminal ของ Historian Kael. Rune Terminal ให้ temporary shield เฉพาะ scene/HUD state และไม่แก้ inventory หรือ equipment จริง เพื่อรักษา integrity ของ offline-first session.

Ruin Guardian เปิดเมื่อเก็บ Ancient Relic 3 ชิ้นหรือกำจัด Sentinel Drone 4 ตัว จากนั้น Matrix Core จะเริ่ม telegraph Matrix Overlord ได้เฉพาะนอกช่วง sweep. แผน Gemini อยู่ที่ `/home/ubuntu/gemini_arcane_map008_slice_plan_response.json` และสำเร็จผ่าน fallback `gemini-3.1-flash-lite` หลัง cooldown ตาม GAME_RULES.md.
