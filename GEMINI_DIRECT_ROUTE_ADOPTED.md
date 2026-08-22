# Gemini Direct Route Plan — Adopted Scope

นำ route contract ที่เข้ากันกับต้นแบบปัจจุบันมาใช้: `?route=` เป็นรูปแบบ direct-entry ที่คงอยู่ และ `?demo=` ยังคงรองรับสำหรับ URL ตรวจงานเดิม. ทุก direct route เริ่มจาก hydration แล้วเรียก `transitionTo`; map route ผ่าน `prepareMapModule()` ก่อนเข้าฉาก Babylon.

| ข้อเสนอ Gemini | การนำมาใช้ |
|---|---|
| Loading gate ก่อนเปิด map | ใช้ `transitionTo` เดียวกับปุ่มในเกมและ direct entry |
| Cache Storage-first decision | `prepareMapModule()` คืน `ready/cached/offline` ชัดเจน |
| Offline uncached fallback | ไม่เขียน metadata ใหม่ขณะ offline; โหลด gate ต่อไปยัง Maps พร้อม Thai toast |
| Route test matrix | Pure direct-route tests และ cache tests สำหรับ online first load, offline cached, offline uncached |
| Silent ID generation | ไม่ใช้ เพราะ production prototype ต้องเริ่มจาก Player ID ที่ผู้เล่นเลือก; direct `route` เป็นเครื่องมือ review เท่านั้น |

ข้อเสนอ engine-ready timeout และ 2D mini-game fallback ไม่ได้อยู่ใน milestone นี้ เพราะ Babylon lifecycle ยังไม่มี ready callback contract และการเพิ่ม mini-game จะขยาย scope เกิน loading/recovery flow.
