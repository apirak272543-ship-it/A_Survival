# Offline-First Sync Milestone

ระบบ offline-first ได้รับการยกระดับตามแผนที่ Gemini เสนอ โดยคงหลักการ Player ID-only และไม่ขัดขวางการเล่นเมื่อไม่มีเครือข่าย Dexie เก็บ transaction queue พร้อม `actorId`, `txId`, vector clock, สถานะ `syncedAt` และเพดานคิว 1,000 รายการ ส่วน server เพิ่ม `gameSyncTransactions` เพื่อป้องกัน replay ด้วย unique transaction ID และรวม logical clocks แบบ deterministic

| ส่วนประกอบ | สถานะ | พฤติกรรมปัจจุบัน |
| --- | --- | --- |
| Local vector clock | พร้อม | เพิ่มตาม `deviceToken`, เปรียบเทียบ before/after/equal/concurrent และรวมด้วย counter สูงสุด |
| Dexie transaction queue | พร้อม | เปลี่ยน pending actions เป็น envelope แบบ idempotent โดยไม่รอเครือข่าย |
| Batch sync API | พร้อม | รับสูงสุด 100 transactions ต่อครั้ง, จด transaction ID เดิมเป็น accepted โดยไม่ apply ซ้ำ, ปฏิเสธ action type/actor ที่ไม่ตรง profile |
| Server authority | พร้อมระดับฐาน | transaction ฝั่ง client ถูกบันทึกเป็น audit/event log; inventory mutation ยังไม่ apply อัตโนมัติจนกว่าจะมี provenance validation ราย action |
| Service worker | พร้อมระดับฐาน | app shell เป็น network-first with offline fallback, art/module เป็น cache-first, cleanup cache version เก่า และส่ง foreground sync request เมื่อรองรับ browser sync event |
| Fallback sync | พร้อม | online, visibility change และ message จาก service worker จะ trigger foreground flush แบบ best-effort |

> **ข้อจำกัดโดยตั้งใจ:** Player ID-only ไม่มี secret ฝั่ง client จึงไม่ใช้ client-generated HMAC เป็นหลักฐานความถูกต้อง การให้ไอเทม, การคราฟต์ และการเก็บเกี่ยวที่เปลี่ยน inventory ยังต้องขยายเป็น server-validated action พร้อม provenance/rate rule ก่อนเปิดใช้การ apply transaction เป็น authoritative state

การทดสอบล่าสุดผ่านทั้งหมด 15 รายการ ครอบคลุม catalog/integrity เดิม, map modules และ vector-clock ordering/merge. ขั้นตอนถัดไปตาม roadmap คือความสัมพันธ์ home–building–farm–pet, integrity events ที่ผู้เล่นมองเห็น และการเปลี่ยน transaction log ให้ apply state แบบ server-validated ทีละ action.
