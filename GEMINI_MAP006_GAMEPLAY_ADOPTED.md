# MAP_006 Magnetic Dunes — แนวทาง Gemini ที่นำมาใช้

MAP_006 นำแนวทางของ Gemini มาใช้เป็น **Magnetic Storm** แบบ deterministic ที่กระทบเฉพาะ presentation ของ scene/HUD ชั่วคราว โดยแสดงสถานะ interference และส่ง Magnetic Hover-Ray reinforcement ออกมา ขณะที่ Magnetic Stabilizer ของ Engineer Rusty ให้ shelter immunity ทั้งต่อ storm signal และ aggro ของศัตรูที่อยู่ใน scene

การออกแบบนี้จงใจไม่แก้ ลบ ลดค่า หรือเขียนทับ inventory/equipment จริง เพราะ event environment ไม่ควรทำลาย integrity และ provenance ของผู้เล่น offline-first เงื่อนไขเปิด Ironclad Golem คือเก็บ Magnetite Sand 3 หน่วยหรือกำจัด Hover-Ray 4 ตัว และกดโต้ตอบ Lodestone Core นอกช่วง storm เพื่อสร้าง telegraph ก่อน boss presentation

แผน Gemini ฉบับเต็มอยู่ที่ `/home/ubuntu/gemini_arcane_map006_slice_plan_response.json` และคำขอรวมสถาปัตยกรรม, HUD, asset brief, invariants, tests และ suggestions ไว้ใน batch เดียวตาม GAME_RULES.md
