# MAP_008 Ancient Obsidian Ruins — Gameplay Slice

| วงจรที่มีในต้นแบบ | พฤติกรรมที่ตรวจสอบได้ |
|---|---|
| Defense Sweep | สลับตามเวลา deterministic; นอก Rune Terminal ได้ laser damage 5 หน่วย/วินาที |
| Rune Terminal | Historian Kael เป็น shelter รัศมี 7 หน่วย, ให้ temporary shield ใน scene และเป็น safe reset |
| Ancient Relic | ส่ง `material-008`, event `map008-ancient-relic-*`, provenance ประเภท `harvest` |
| Ruin Guardian | เปิดเมื่อ Relic 3 หน่วยหรือ Sentinel Drone 4 ตัว |
| Matrix Overlord | โต้ตอบ Matrix Core นอก Defense Sweep หลัง elite เปิดแล้ว; telegraph 2.6 วินาทีก่อน boss presentation |

ระบบนี้ไม่มี boss action pattern เต็มรูปแบบ, collision/hitbox, drop table, SFX/audio, laser shader, Lore Log UI, server-authoritative replay หรือ persistence ระหว่าง session จึงเป็นเพียง **map-specific gameplay slice** ไม่ใช่ MAP_008 production-complete.
