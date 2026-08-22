# MAP_001 Obsidian Frontier — Gameplay Slice

วันที่บันทึก: 22 สิงหาคม 2026

MAP_001 มี gameplay slice ที่แยกจาก expedition framework ทั่วไปแล้ว โดยใช้ encounter state ใน client ควบคุม safe zone ของ Commander Koral, Distress Pod Trap, Leyline Monolith และ Void Reaper night breach

| ส่วน | สิ่งที่ทำงานแล้ว | หลักฐานการตรวจ |
|---|---|---|
| Safe zone | Commander Koral เป็นจุดกลับเมื่อ health หมด; reset ไม่มี reward action | `map001Encounter.test.ts` |
| Surprise event | Interact ในระยะ Distress Pod เริ่ม telegraph แล้ว spawn Glass Stalkers 3 ตัว | deterministic state test |
| Night boss | Void Reaper ต้องเริ่ม telegraph ที่ Leyline Monolith ใน night phase ก่อน active | deterministic state test |
| Reward | เก็บ Ley Crystal ส่ง reward callback แบบ idempotent เข้า session เป็น `material-003` พร้อม `harvest` provenance, map ID และ event ID | unit test reward instance |
| Visual/HUD | เพิ่ม asset Commander Koral, Monolith, Obsidian Golem และ Frontier Alloy จาก Gemini brief → Pollinations; HUD มี text telegraph สำหรับ reduced motion | desktop และมือถือแนวนอน screenshot |

> Gameplay slice นี้ยัง **ไม่ใช่ MAP_001 content-complete**. งานที่คงเหลือคือ objective/interaction UI แบบเต็ม, animation/attack ของ elite และ boss, soundscape, alpha-safe sprites, event drop validation ฝั่ง server, และ scene environment pass ที่เปลี่ยนจาก texture plane ไปเป็นโลกเฉพาะแผนที่อย่างสมบูรณ์

การทดสอบล่าสุดผ่าน `pnpm check` และ Vitest 25 tests โดยไม่มี runtime error ใหม่ใน browser console หลังทดสอบ MAP_001 บน viewport 1280×720 และ 812×375
