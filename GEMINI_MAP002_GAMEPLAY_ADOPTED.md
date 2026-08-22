# Gemini MAP_002 Ash Storm Plan — Adopted Scope

นำ state machine ที่ deterministic สำหรับ Ash Storm, elite threshold, altar telegraph และ safe reset มาใช้กับ `MAP_002` โดยปรับ recommendation ที่เกิน scope: ไม่มี cryptographic signature/Merkle tree หรือ durability loss เพราะ current offline provenance contract ใช้ `eventId`, `parentEventId` และ `integrityHash` ที่ server ตรวจซ้ำได้เป็นขั้นแรก.

| Gemini recommendation | การนำไปใช้ |
|---|---|
| Ash Storm 7.5 นาที / 2 นาที | `MAP002_STORM_PERIOD_MS` และ `MAP002_STORM_DURATION_MS` กำหนด window แบบ deterministic |
| Elite threshold | เก็บ Ember Ore 3 node หรือฆ่า Ash Crawler 5 ตัว → Obsidian Shell Golem telegraph |
| Storm altar boss | ต้อง interact ระหว่าง storm, telegraph 2.6 วินาที แล้ว Behemoth คง state จนกว่าจะมีระบบ boss damage/resolution |
| Safe zone | Scavenger Jax camp รีเซ็ต health/position เมื่อ player defeat |
| Storm reward | Ember Ore reward เรียก callback แบบ harvest พร้อม event ID ที่เฉพาะเจาะจง |
| Performance | assets เป็น billboard textures; ไม่มี high-poly mesh/particle system เพิ่ม |

> ข้อจำกัด: บอส/elite ใน milestone นี้มี telegraph และ presence ใน scene แต่ยังไม่มี health/action/drops เฉพาะตัวครบชุด. จึงไม่ mint legendary boss reward และไม่อ้างว่า MAP_002 เสร็จสมบูรณ์.
