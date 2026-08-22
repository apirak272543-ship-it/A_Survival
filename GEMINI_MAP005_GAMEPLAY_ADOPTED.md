# MAP_005 Corrosive Acid Swamps — แนวทาง Gemini ที่นำมาใช้

MAP_005 ใช้แกน encounter เป็น **Acid Drizzle** ที่เกิดตามหน้าต่างเวลาแบบ deterministic เพื่อให้ทดสอบและเล่นซ้ำได้ สภาพอันตรายสร้างความเสียหายต่อเนื่องเฉพาะผู้เล่นที่อยู่นอกจุดหลบภัยของ Alchemist Vane ขณะที่การเก็บ Toxic Lily หรือกำจัด Acid Slime ถึงเกณฑ์จะเปิด Mire Lurker elite และการกดโต้ตอบที่ Hydra Nest ในช่วงไม่มีฝนกรดจะเริ่ม telegraph ก่อนเปิด Toxic Hydra

การนำมาใช้ในต้นแบบนี้ยึดหลัก mobile landscape: HUD แจ้งสถานะอันตรายแบบสั้น, NPC/shelter เป็นจุดนำทางที่เห็นได้ใน scene, และ reset ผู้เล่นกลับ shelter เมื่อพลังชีวิตหมด ระบบนี้ไม่ประกาศว่าเป็น combat/boss loop สมบูรณ์ เพราะยังไม่มีระบบโจมตีเฉพาะของ Hydra, hitbox เชิงลึก, audio, drop table หรือ server-authoritative replay

แผน Gemini ฉบับที่ใช้เป็นต้นทางเก็บไว้ที่ `/home/ubuntu/gemini_arcane_map005_slice_plan_response.json` และได้รวมคำขอข้อเสนอแนะเพิ่มเติมไว้ใน batch เดียวตาม GAME_RULES.md
