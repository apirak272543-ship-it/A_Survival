# MAP_009 — Gemini-adopted gameplay slice

## ขอบเขตที่นำมาใช้

MAP_009 ใช้ identity หลัก **Overgrown Obsidian Jungle** จาก registry และปรับ NPC, elite, boss, resource และ encounter ให้ตรงกับแผน Gemini ที่สำเร็จด้วย fallback `gemini-3.1-flash-lite` หลังโมเดลก่อนหน้าตอบสนองไม่สมบูรณ์ แผนที่ใช้ **Toxic Downpour** เป็น environmental window แบบ deterministic, **Canopy Haven** เป็น safe zone และ **Verdant Hive Root** เป็นจุดเริ่ม boss telegraph

| ส่วนประกอบ | ชื่อที่ใช้จริง | Contract ที่นำมาใช้ |
|---|---|---|
| NPC / shelter | Botanist Iris · Canopy Haven | ผู้เล่นได้รับ canopy protection ภายในรัศมี shelter |
| Regular enemy | Vine Stalker | reinforcement สองตัวเมื่อเริ่มฝนพิษ |
| Elite | Thornback Behemoth | แสดงเมื่อเก็บ Alien Bloom 3 ครั้งหรือกำจัด Vine Stalker 4 ตัว |
| Boss presentation | Verdant Hive Mind | telegraph 2.6 วินาทีที่ Verdant Hive Root หลัง elite และนอกหน้าต่างฝนพิษ |
| Resource | Alien Bloom | harvest reward ใช้ `material-009` และ event ID เฉพาะ resource |

แผน Gemini ยังเสนอให้รักษา mobile-landscape readability และขอข้อเสนอแนะเพิ่มใน batch เดียวกัน จึงเลือก billboard asset ที่มี silhouette และ contrast ชัดเจนเหนือ terrain veil.

## Invariants

Toxic Downpour เป็น state ชั่วคราวของ scene/HUD เท่านั้น โดยทำความเสียหาย **5 ต่อวินาที** เมื่ออยู่นอก Canopy Haven และไม่เขียน inventory หรือ equipment แม้แต่น้อย. การ reset เมื่อ health หมดจะย้ายกลับ canopy และคืน health เพื่อให้ prototype ไม่เกิด dead-end. Boss telegraph ถูก gate ไม่ให้เริ่มระหว่าง Downpour.

> ขอบเขตนี้เป็น client-side prototype ที่ deterministic เพื่อรองรับการทดสอบ ไม่ใช่ระบบ combat, drop, anti-cheat หรือ boss encounter ที่ server-authoritative.
