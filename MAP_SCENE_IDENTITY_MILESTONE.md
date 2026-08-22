# MAP_002–MAP_010 Scene Identity Milestone

เพิ่ม scene treatment ที่ data-driven ให้ expedition prototype ทั้งเก้า โดยทำให้แผนที่ต่างกันผ่าน scene-level appearance และ HUD signal ไม่ใช่แค่ key art บนหน้าโหลด. MAP_001 คง gameplay slice และ event state machine เดิมโดยไม่ถูกแทนที่.

| ขอบเขตที่เพิ่ม | หลักฐาน |
|---|---|
| Palette/fog/light/terrain veil | ครอบคลุม 9 map IDs ใน `MAP_SCENE_TREATMENTS` |
| Landmark presence | key art ของ map ถูกวางเป็น landmark plane พร้อม kind/label metadata |
| Ambient hazard signal | Ash Storm, Spore Release, Crystal Resonance, Acid Drizzle, Magnetic Storm, Blizzard, Rune Activation, Pollen Surge และ Void Pulse |
| Visual verification | ตรวจ MAP_002 และ MAP_010 บน viewport 812×375; องค์ประกอบสี/fog/HUD แตกต่างกันชัดเจน |
| Relationship tests | 38 tests ผ่าน, รวม schema ที่ห้าม treatment ครอบคลุม MAP_001 หรือ MAP_011+ |

> ข้อจำกัดที่ยังคงอยู่: regular enemy/resource/boss plane ของ MAP_002–MAP_010 ยังใช้ asset framework ร่วมจาก MAP_001. Milestone นี้เพิ่ม **scene identity** ไม่ใช่ asset/action/audio set เฉพาะแผนที่ครบถ้วน.
