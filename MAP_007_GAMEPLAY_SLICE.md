# MAP_007 Frozen Obsidian Crevasses — Gameplay Slice

| วงจรที่มีในต้นแบบ | พฤติกรรมที่ตรวจสอบได้ |
|---|---|
| Blizzard | สลับตามเวลา deterministic; นอก Steam Vent ได้ frostbite overlay และความเสียหาย 5 หน่วย/วินาที |
| Steam Vent Haven | Scout Frost เป็น shelter รัศมี 7 หน่วย พร้อม safe reset เมื่อพลังชีวิตหมด |
| Cryo Crystal | ส่ง `material-007`, event `map007-cryo-crystal-*`, provenance ประเภท `harvest` |
| Cryo-Beast | เปิดเมื่อ Crystal 3 หน่วยหรือ Frostbite Weaver 4 ตัว |
| Glacial Terror | โต้ตอบ Frozen Rift นอก Blizzard หลัง elite เปิดแล้ว; telegraph 2.6 วินาทีก่อน boss presentation |

ระบบนี้ไม่มี boss action pattern เต็มรูปแบบ, collision/hitbox, drop table, audio/SFX, shader frostbite, crafting Heat Retention, server-authoritative replay หรือ persistence ระหว่าง session จึงเป็น **map-specific gameplay slice** ไม่ใช่ MAP_007 production-complete
