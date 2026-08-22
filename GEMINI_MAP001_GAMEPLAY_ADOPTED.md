# MAP_001 Gameplay Plan Adopted from Gemini

แผนนี้นำมาจากคำขอ Gemini แบบรวมสำหรับ **Obsidian Frontier** และเป็นสัญญาสำหรับ gameplay slice ถัดไปของ MAP_001

| ส่วน | แนวทางที่นำมาใช้ |
|---|---|
| State | Safe zone → Exploring → Combat/Event → Safe reset โดย Commander Koral เป็นจุดกลับคืน |
| Event | Distress Pod Trap มี telegraph ก่อนเปิด, spawn Glass Stalkers และ reset อย่างปลอดภัย; Void Reaper ปรากฏเฉพาะกลางคืนบริเวณ Leyline Monolith |
| Reward | Ley Crystal และ Frontier Alloy สร้าง offline action ที่มี target instance, map ID และ timestamp; server ยังตรวจ provenance เมื่อซิงก์ |
| HUD | แสดง objective, telegraph และ reduced-motion fallback แบบข้อความ/opacity แทน flash หรือ screen shake |
| Asset | ใช้ Gemini brief สำหรับ Commander Koral, Leyline Monolith, Obsidian Golem และ Frontier Alloy แล้วดึงภาพจริงผ่าน Pollinations ตามกฎโครงการ |

## ข้อปรับด้านความปลอดภัย

ไม่ใช้การลงลายมือชื่อด้วย Player ID บน client และไม่ถือ hash ที่ client สร้างเป็นหลักฐานเด็ดขาด เพราะ Player ID ไม่มี secret ที่เชื่อถือได้. ระบบจะใช้ transaction ID ที่ทำซ้ำได้ยาก, vector clock, target identity, plausibility limit และ server-side provenance/integrity validation แทน. เวลา world cycle ใช้ monotonic browser tick สำหรับการนำเสนอ ไม่ใช้เป็นสิทธิ์ให้รางวัลที่ server เชื่อโดยตรง

## ลำดับทำงานที่ยอมรับ

เริ่มจาก asset pack และ deterministic state/event logic ก่อน จากนั้นเชื่อม Babylon scene กับ HUD/transaction queue แล้วเพิ่ม tests สำหรับ trigger, reset, reward action และ reduced-motion behaviour. งานนี้ยังไม่ทำให้ MAP_001 เป็น content-complete map จนกว่าจะมี model/action/audio และ map-specific environment pass ครบตาม `MAP_001_010_BRIEF.md`.
