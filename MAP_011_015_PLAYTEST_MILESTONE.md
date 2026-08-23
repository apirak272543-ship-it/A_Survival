# MAP_011–015 Playtest Milestone

## วิธีตรวจสอบภาพ

1. รัน dev server: `pnpm dev`
2. เปิด `http://localhost:3000/?route=maps`
3. เลื่อนลงดู MAP_011–015 ใน grid แผนที่
4. คลิก "Prepare expedition" หรือ "Enter cached sector"
5. ตรวจสอบ loading transition, key art, NPC, resource nodes, และ HUD warning

## จุดที่ต้องตรวจในแต่ละแผน

| Map | ตรวจสอบ |
|-----|---------|
| 011 | Lava vent warning, Forgemaster Vael shelter, Ignis Colossus telegraph |
| 012 | Ash gale debuff, Scout Kaelen visibility, Gale-Terror Zephyr spawn |
| 013 | Sulfur geyser corrode, Theron Boardwalk safe zone, Bile-Mother Vile |
| 014 | Bridge tremor damage, Warden Post shelter, Trench-Lord Baelrok |
| 015 | Core pulse stamina drain, Forge Shrine reset, Crucible Overlord |

## หมายเหตุ

- ภาพจาก Pollinations จะโหลดเมื่อเปิดแผนที่ครั้งแรกเท่านั้น (ต้องมีอินเทอร์เน็ต)
- ครั้งถัดไปจะใช้ Cache Storage ของ PWA
- หากภาพไม่ขึ้น ให้ตรวจสอบ Network tab ว่า `image.pollinations.ai` ถูกบล็อกหรือไม่
