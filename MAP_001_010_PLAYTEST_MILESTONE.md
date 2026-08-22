# MAP_001–MAP_010 Expedition Prototype Milestone

วันที่บันทึก: 22 สิงหาคม 2026

MAP_001–MAP_010 เปิดเล่นจาก Map Observatory ได้ทั้งหมดในสถานะ **Expedition Prototype** แต่ละ expedition มี key art จาก pipeline Gemini brief → Pollinations, accent, time mode, ระยะพื้นที่, NPC, landmark, regular threat, elite และ event boss ของตัวเอง โดยใช้ Babylon survival combat loop, touch HUD และระบบเก็บทรัพยากรร่วมกันในระดับต้นแบบ

| ช่วงแผนที่ | ความพร้อมที่ตรวจแล้ว | ขอบเขตที่ยังไม่ใช่ production content |
|---|---|---|
| MAP_001–MAP_010 | เลือกจาก Map Observatory, โหลดผ่าน transition, cache-aware, เข้า Babylon scene, render accent/key art terrain, แสดง NPC-landmark-regular threat และ event boss ใน HUD | ศัตรูและทรัพยากรใช้ behaviour core ร่วมกัน; model, boss mechanics, soundscape และ POI เฉพาะรายแผนที่จะเพิ่มใน content pass ถัดไป |
| Offline play | Map shell/key art เก็บใน Cache Storage, profile และ transaction queue อยู่ใน IndexedDB, foreground sync ทำงานเมื่อออนไลน์ | ยังไม่ใช่ conflict-resolution UX สมบูรณ์หรือ Background Sync ที่รับประกันได้ทุก browser |
| Home loop | Home แยกจาก expedition, build/move/rotate/recall, decoration, multi-seed planting, growth/harvest และ pet slots อยู่ใน local state | Companion ใน Home มี bonus state แล้ว แต่ยังไม่ spawn ตามผู้เล่นหรือส่งผล gameplay จริงในฉากสำรวจ |

## วิธีเปิดทดสอบ

ใช้หน้า Map Observatory เพื่อเลือก expedition หรือส่ง query map ไปยังเกมโดยตรง เช่น `/?demo=game&map=map-002-ashen-obsidian-plains` และ `/?demo=game&map=map-010-void-infused-rift` เพื่อทดสอบ identity ของแต่ละแผนที่ใน viewport แนวนอน

> สถานะ **prototype** หมายถึงผู้เล่นสามารถเข้าฉาก เคลื่อนที่ ต่อสู้ เก็บทรัพยากร และเห็น encounter identity เฉพาะแผนที่ได้แล้ว แต่ไม่ได้หมายความว่าทุก map มี quest line, terrain mesh, animation, audio และ boss fight ระดับสุดท้ายครบถ้วน

## การตรวจสอบ milestone

การตรวจ regression ล่าสุดผ่าน `pnpm test` จำนวน 21 tests และ `pnpm check` ผ่านโดยไม่มี TypeScript error ขณะตรวจ map routes บน desktop และมือถือแนวนอน
