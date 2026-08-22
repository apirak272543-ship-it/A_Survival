# MAP_005 Corrosive Acid Swamps — Gameplay Slice

MAP_005 เป็น prototype slice สำหรับการสำรวจ Corrosive Acid Swamps ที่เชื่อม content identity, encounter state และ item provenance เข้ากับ Babylon scene โดยไม่สร้าง MAP_011 หรือแผนที่ใหม่เพิ่มเติม

| วงจรที่มีในต้นแบบ | พฤติกรรมที่ตรวจสอบได้ |
|---|---|
| Acid Drizzle | สลับตามเวลา deterministic; ทำความเสียหาย 6 หน่วย/วินาทีนอก shelter |
| Alchemist Vane shelter | พื้นที่รัศมี 7 หน่วย ป้องกัน Acid Drizzle และเป็นตำแหน่ง safe reset |
| Toxic Lily | เก็บได้ในระยะโต้ตอบ; ส่ง `material-005` พร้อม event ID `map005-toxic-lily-*` และ provenance ประเภท `harvest` |
| Mire Lurker | เปิดเมื่อเก็บ Lily 3 หน่วยหรือกำจัด Acid Slime 4 ตัว |
| Toxic Hydra | โต้ตอบ Hydra Nest ขณะไม่มี drizzle หลัง elite เปิดแล้ว; มี telegraph 2.6 วินาทีก่อน boss presentation |

## ขอบเขตที่ยังไม่สมบูรณ์

ระบบนี้ไม่มี action pattern เต็มรูปแบบของ Mire Lurker หรือ Toxic Hydra, boss collision/hitbox, drop table เฉพาะบอส, audio/SFX, particle simulation, persistence ของสถานะ boss ระหว่าง session หรือการตรวจ replay ฝั่งเซิร์ฟเวอร์ ดังนั้นการส่งมอบครั้งนี้เรียกได้เพียง **map-specific gameplay slice** ไม่ใช่ MAP_005 production-complete

การตรวจสอบล่าสุดผ่าน TypeScript และ Vitest 18 ไฟล์ 55 tests พร้อมการดู scene ที่ขนาด 812×375 โดยไม่พบ browser console error ในรอบตรวจ
