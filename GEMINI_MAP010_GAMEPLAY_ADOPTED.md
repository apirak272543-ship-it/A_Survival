# MAP_010 — Gemini-adopted gameplay slice

MAP_010 ใช้ registry ID **`map-010-void-infused-rift`** และชื่อที่ registry กำหนดอยู่แล้ว: Void Wanderer, Void Larva, Rift Horror, Void Singularity และ Void Essence. Gemini fallback `gemini-3.1-flash-lite` วางแผน **Void Pulse ทุก 60 วินาที** พร้อม **Stable Rift Pylon** เป็น safe zone, timer/warning ที่อ่านได้บน mobile landscape, Rift Horror elite และ gate 10 Void Essence สำหรับ Void Singularity.

| ส่วนประกอบ | การนำมาใช้ใน prototype |
|---|---|
| Environmental event | Void Pulse 5 วินาทีต่อ cycle 60 วินาที พร้อม warning 4.5 วินาที |
| Counterplay | Stable Rift Pylon ป้องกัน void decay ภายในรัศมี 7 units |
| Elite | Rift Horror เมื่อเก็บ essence 5 หน่วยหรือกำจัด Void Larva 4 ตัว |
| Boss gate | ต้องมี elite state, 10 Void Essence, อยู่ที่ Singularity Gate และอยู่นอก Pulse |
| Suggestion ที่เก็บเป็นงานต่อ | Void-Gaze post-process, spatial pylon audio และ IndexedDB persistence ยังไม่ทำใน milestone นี้ |

> Resolver ไม่มี inventory input หรือ mutation path; `inventoryMutation` เป็น `false` เสมอ. Damage จาก environment จะไม่เกิดเมื่อ `menuOpen` ใน resolver แต่ scene prototype ปัจจุบันยังไม่มี pause/menu state ที่ส่งค่านี้เข้ามา.
