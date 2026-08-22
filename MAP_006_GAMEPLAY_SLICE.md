# MAP_006 Magnetic Dunes — Gameplay Slice

MAP_006 เป็น prototype slice สำหรับ Magnetic Dunes ที่เชื่อม visual identity, deterministic Magnetic Storm, safe-zone logic และ reward provenance เข้ากับ Babylon scene โดยไม่เพิ่ม MAP_011 หรือโมดูลแผนที่ใหม่

| วงจรที่มีในต้นแบบ | พฤติกรรมที่ตรวจสอบได้ |
|---|---|
| Magnetic Storm | เกิดตามหน้าต่างเวลา deterministic; แสดง HUD interference ชั่วคราวและ spawn Hover-Ray reinforcement |
| Magnetic Stabilizer | ตำแหน่ง Engineer Rusty รัศมี 7 หน่วย ป้องกัน interference และทำให้ศัตรูหยุด aggro ใน safe zone |
| Magnetite Sand | เก็บในระยะโต้ตอบ; ส่ง `material-006` พร้อม `map006-magnetite-sand-*` และ provenance ประเภท `harvest` |
| Ironclad Golem | แสดงเมื่อเก็บ Magnetite Sand 3 หน่วยหรือกำจัด Magnetic Hover-Ray 4 ตัว |
| Lodestone Colossus | โต้ตอบ Lodestone Core ขณะ storm ไม่ทำงานหลัง elite เปิดแล้ว; มี telegraph 2.6 วินาทีก่อน boss presentation |

## Invariant สำคัญ

Magnetic Storm ไม่มีเส้นทางแก้ไข inventory, equipment slot, item instance, provenance หรือ persistent stat ของผู้เล่น การรบกวนทั้งหมดเป็น state ใน scene/HUD และหมดไปเมื่อออกจาก storm หรือเข้าสู่ stabilizer

## ขอบเขตที่ยังไม่สมบูรณ์

ระบบนี้ยังไม่มี action pattern เต็มรูปแบบของ Ironclad Golem/Lodestone Colossus, boss collision/hitbox, drop table บอส, SFX/audio, shader distortion, crafting Magnetic Shielding, server-authoritative replay หรือ persistence ของ boss state ระหว่าง session จึงเป็นเพียง **map-specific gameplay slice** ไม่ใช่ MAP_006 production-complete
