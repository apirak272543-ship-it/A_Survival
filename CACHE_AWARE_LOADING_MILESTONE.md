# Cache-aware Loading Transition Milestone

Loading transition ของ expedition เปลี่ยนจาก progress สุ่มเป็นสถานะที่มาจากการเตรียม map module จริงแล้ว

| Stage | พฤติกรรม |
|---|---|
| Module metadata | บันทึก/อ่านข้อมูล map module ใน Cache Storage ก่อนเข้า scene |
| Key art | ใช้ asset จาก cache หากมี หรือดาวน์โหลดและบันทึกในครั้งแรกเมื่อออนไลน์ |
| Offline fallback | เมื่อ `navigator.onLine === false` จะไม่ขอ network asset; เก็บ map metadata ให้ใช้ต่อ และแจ้ง phase ใน loading UI |
| UI | แสดง biome key art, accent, phase text, percent และ cached/offline route; ทุก route ยังคงมี transition แม้ cache พร้อมแล้ว |
| Test | `mapCache.test.ts` ตรวจ download path, cached path และ offline path; regression ล่าสุดผ่าน 28 tests |

> ขอบเขตที่ยังคงเหลือคือ precache JavaScript map bundles แบบ Workbox, Background Sync ที่ browser รองรับเต็มรูปแบบ และ progress ที่ผูกกับ texture decode/scene compilation จริง. ต้นแบบปัจจุบันวัด metadata และ key-art preparation ซึ่งเป็นงานเครือข่ายที่ตรวจสอบได้โดยตรง
