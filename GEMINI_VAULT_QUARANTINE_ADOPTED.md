# Gemini Vault Quarantine Plan — Adopted Scope

นำ Vault layout แบบ landscape split view, instance detail, quarantine stripe/badge, action gating และ Thai recovery copy มาใช้. ระบบนี้ไม่ปลดล็อก item ด้วยการตรวจ local ปลอม: CTA จะขอ sync/recheck และ item จะกลับมาใช้งานได้ต่อเมื่อ integrity verdict รอบถัดไปไม่มี `instanceId` นั้นแล้ว.

| Gemini recommendation | การนำไปใช้ |
|---|---|
| 3-column Vault | navigation, instance grid และ detail/action panel บนจอ landscape |
| Per-instance quarantine | red stripe, warning badge, accessible label และ disabled action buttons |
| Equip action | deterministic local equipment-slot toggle สำหรับ item equippable ที่ safe |
| Use/trade/dismantle | แสดงสถานะตรงตามจริง: use ไม่มี field effect ใน prototype, trade/dismantle เป็น placeholder no-op |
| Recovery CTA | `ตรวจสอบและซิงก์ใหม่` ขอ server/local pipeline recheck โดยไม่ remove quarantine state เอง |
| Color-blind cue | text badge + ShieldAlert + diagonal stripe ไม่พึ่ง border color อย่างเดียว |

ข้อเสนอ HMAC secure enclave และ haptic pattern ยังไม่ทำ เพราะต้องมี native device bridge/secret model ที่ browser prototype ยังไม่มี.
