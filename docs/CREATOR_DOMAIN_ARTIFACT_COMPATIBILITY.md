# Creator Domain Artifact Runtime Compatibility Preview

`creator.artifact.compatibility` เป็น validator ฝั่ง developer ที่ตรวจ metadata ของ artifact กับ playable runtime allow-list โดยไม่ import asset และไม่เปลี่ยน player state. ใน checkpoint นี้ allow-list มีเพียง `obsidian-frontier`; target map อื่นรวมถึง planned future maps จะถูก block

| Check | ขอบเขตที่ตรวจ | ผลเมื่อไม่ผ่าน |
|---|---|---|
| Runtime map | target ต้องเป็น `obsidian-frontier` | `FUTURE_MAP_NOT_ALLOWED` |
| Review | record ต้องเป็น `approved` | `REVIEW_NOT_APPROVED` |
| Reviewer audit | ต้องมี reviewer id และ timestamp | `REVIEW_AUDIT_MISSING` |
| Runtime policy | import/player visibility/cache ต้องเป็น `false` | `RUNTIME_POLICY_ENABLED` |
| Integrity | content hash ต้องเป็น lowercase SHA-256 64 ตัว | `CONTENT_HASH_INVALID` |
| Provenance | generator/schema/source/provenance refs ต้องครบ | `PROVENANCE_MISSING` |
| Payload | manifest/summary/provenance ห้ามมี binary-like keys | `BINARY_PAYLOAD_PRESENT` |

เมื่อทุก check ผ่าน ผลลัพธ์คือ `decision: reviewable` ไม่ใช่ `publishReady`. ผลลัพธ์ยังบังคับ `runtimeImportAllowed: false` และ `publishReady: false` เสมอ เพื่อไม่ให้ compatibility preview กลายเป็น auto-import/publish path. ถ้า record ยังเป็น draft หรือ rejected validator จะคืน `blocked` พร้อม reason ที่เจาะจง และไม่หลอกว่า asset พร้อมใช้

Workbench มี selector target runtime map และปุ่ม `ตรวจ runtime compatibility` เฉพาะใน developer-only registry card. การเลือก `Map 002 · future / blocked` มีไว้ตรวจ guard เท่านั้น ไม่ทำให้ map ถูก selectable, cache-prepared หรือ playable ใน player runtime

> **ข้อจำกัด:** ยังไม่มี admin-authenticated DB E2E, asset bytes/model compatibility check, downloadable bundle, runtime import, map unlock หรือ production publish. Validator นี้เป็น metadata gate สำหรับขั้นตอนถัดไปเท่านั้น
