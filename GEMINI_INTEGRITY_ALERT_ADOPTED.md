# Gemini Integrity Alert Plan — Adopted Scope

แผน Gemini ถูกนำมาใช้ในรูปแบบ **client-side integrity safety net** สำหรับเกม Player ID-only: ตรวจ duplicate instance ID, item definition/stack/enhancement ผิดขอบเขต, และ provenance ที่ขาดหรือไม่เชื่อม event แล้วกักเฉพาะ `instanceId` ที่ผิดปกติ. UI แสดงสถานะ `REVIEW`, recovery sheet และข้อความว่ารายการอื่นยังใช้งานได้.

แนวทางที่ตั้งใจไม่ใช้คือ client-side signature/HMAC หรือการกล่าวหาว่าผู้เล่นโกงแบบเด็ดขาด เพราะเซฟบน client และ Player ID ไม่ใช่ credential ที่เชื่อถือได้. Server sync ยังคงบันทึก integrity log เมื่อ payload หรือ offline action ถูกปฏิเสธ; การยืนยัน authoritative ของประวัติ item และการแก้ conflict ข้ามอุปกรณ์เป็นงานถัดไป.

| Gemini recommendation | การนำไปใช้ใน milestone นี้ |
|---|---|
| Quarantine per item instance | `IntegrityReport.quarantinedInstanceIds` และ copy ที่ระบุว่าไม่ปิดคลังทั้งหมด |
| Non-blocking gameplay | `canContinue: true`; lobby/map/home/game ยังเปิดได้ |
| Recovery messaging | แนะนำ sync ซ้ำจาก Lobby และเก็บ item ไว้ให้ server ตรวจ |
| Duplicate UUID / provenance tests | Vitest ครอบคลุม duplicate, missing provenance และ valid item |
| Server authority limitation | ระบุใน sheet และเอกสารว่าเป็น guardrail ไม่ใช่ anti-cheat เต็มรูปแบบ |
