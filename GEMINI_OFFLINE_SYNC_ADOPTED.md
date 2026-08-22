# Gemini Offline Sync Plan — Adoption Record

Gemini เสนอให้ใช้ transaction envelope แบบ idempotent, vector clock ต่ออุปกรณ์, queue บน Dexie, การ merge แบบกำหนดผลได้, Cache Storage-first สำหรับ asset/module, Background Sync เมื่อรองรับ และ foreground fallback เมื่อไม่รองรับ แนวทางดังกล่าวเข้ากับข้อกำหนดเล่นออฟไลน์ก่อนและไม่บล็อกการเล่นของ Arcane Frontier Survival จึงนำมาใช้เป็นแผนพัฒนาในลำดับด้านล่าง

| ข้อเสนอจาก Gemini | สถานะ | การนำไปใช้ในโครงการ |
| --- | --- | --- |
| Vector clock แบบ `Record<actorId, number>` | รับ | ใช้ `deviceToken` เป็น actor ID และรวมด้วยค่า maximum ต่อ key |
| Transaction queue พร้อม `txId`, payload, clock, `syncedAt` | รับ | เพิ่ม action envelope ที่ idempotent และคิวจำกัดขนาด |
| Inventory แบบ instance และ soft delete | รับบางส่วน | เริ่มจาก event log ที่ตรวจ provenance; เพิ่ม soft delete เมื่อ inventory mutation ถูกแยกจาก save bundle |
| Server-authoritative merge ของ inventory | รับ | ฝั่ง server เป็นผู้ตัดสิน conflict ของ inventory; map/home state ใช้ deterministic last-write-wins เฉพาะ field ที่ปลอดภัย |
| `syncBatch` + replay protection จาก transaction ID | รับ | เพิ่ม endpoint ใหม่ข้าง `sync` เดิมแบบ backward-compatible |
| Background Sync + online/visibility/manual fallback | รับ | ลงทะเบียนเมื่อ browser รองรับ และ fallback จะไม่พึ่ง background process ถาวร |
| Cache-first app shell และ art/module | รับ | ปรับ service worker ให้แยก cache shell, art และ map module พร้อม cleanup version เก่า |
| HMAC จาก client เพื่อยืนยัน provenance | ไม่รับตามคำแนะนำเดิม | client ที่ไม่มี secret ปลอดภัยไม่สามารถสร้าง HMAC ที่ server เชื่อถือได้; จึงให้ server ตรวจ type/source/timestamp/rate limit และออก server proof สำหรับ item สำคัญหลัง sync |
| Player ID เป็น UUID ที่สร้างเอง | ไม่รับ | ผู้เล่นต้องกรอก Player ID/name อิสระตามข้อกำหนดเดิม; `deviceToken` เท่านั้นที่เป็น actor ID ภายในอุปกรณ์ |
| MessagePack/Protocol Buffers | เลื่อน | JSON envelope ถูกเก็บไว้ก่อนเพื่อลดความเสี่ยงของ schema migration และรองรับ debug/offline recovery |

> **กฎ merge ที่นำมาใช้:** Clock A ครอบงำ B เมื่อทุก key ของ A มากกว่าหรือเท่ากับ B และอย่างน้อยหนึ่ง key มากกว่า; ถ้าไม่มีฝ่ายใดครอบงำถือเป็น concurrent conflict. Transaction เดิมจะตอบรับแบบ idempotent โดยไม่ apply ซ้ำ. Inventory conflict และ provenance ที่ขัดกติกาจะไม่ถูก merge เข้าฝั่ง client อัตโนมัติ

ลำดับ implementation คือ ปรับ Dexie และ utility merge → เพิ่ม batch sync contract/server idempotency → ปรับ service worker/fallback trigger → ทดสอบ replay, conflict, queue limit และ cache failure. การดำเนินการนี้ไม่เพิ่ม cron, worker ถาวร หรือการยืนยันตัวตนรูปแบบใหม่
