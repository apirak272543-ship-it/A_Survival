# AI-6 Handoff — T-07 Quest Reward Capability Boundary

## ขอบเขต checkpoint

Checkpoint นี้เป็น bounded sub-checkpoint ของ `T-07` สำหรับจำแนก reward capability ก่อนเข้าสู่ canonical quest-reward transaction โดยแยก item reward ที่ส่งต่อให้ item/inventory owner ได้ ออกจาก ability และ reputation reward ที่ยังไม่มี runtime owner จริง ผลลัพธ์เป็น pure/read-only preview และ fail-closed

> **หลักการสำคัญ:** การพบ `abilityId` หรือ `reputation` ไม่ทำให้ระบบสร้าง reward สำเร็จ แต่คืน required blocker ที่ระบุ owner ที่ยังขาดอยู่ การมี `itemDefinitionId` เพียงอย่างเดียวก็ยังไม่ใช่การยืนยันว่า item definition, inventory capacity หรือ persistence ผ่านแล้ว

## ไฟล์ที่เปลี่ยน

| ไฟล์ | หน้าที่ | สถานะ |
|---|---|---|
| `server/generators/questRewardCapabilityBoundary.ts` | จำแนก item/ability/reputation/unknown reward, ตรวจ ambiguous/invalid value, future map และ reward-count bound | เพิ่มใหม่ |
| `server/questRewardCapabilityBoundary.test.ts` | ทดสอบ item-only support, missing ability/reputation owners, malformed values, future-map denial, bounded list และ determinism | เพิ่มใหม่ |
| `docs/AI_CLAIM_T07_REWARD_CAPABILITY_BOUNDARY.md` | บันทึก claim, branch, base SHA, exact reservation และ dependency limitation | เพิ่มใหม่ |
| `docs/AI_HANDOFF_T07_REWARD_CAPABILITY_BOUNDARY_REPORT.md` | รายงาน checkpoint และ non-claims | เพิ่มใหม่ |

## สิ่งที่ตรวจและผลลัพธ์

| Owner | สิ่งที่ตรวจ | ผล | Blocker/ข้อจำกัด |
|---|---|---|---|
| Quest reward capability | reward หนึ่งรายการมี capability ที่ชัดเจนเพียงหนึ่งแบบ | item-only เป็น `supported`; shape ที่มีหลาย capability เป็น `AMBIGUOUS_REWARD_SHAPE` | ยังไม่แจก reward และยังไม่ complete quest |
| Ability runtime | `abilityId` | คืน `ABILITY_RUNTIME_OWNER_MISSING` | ไม่มี canonical ability runtime owner ใน checkpoint นี้ |
| Reputation runtime | `reputation` ที่เป็น finite number | คืน `REPUTATION_RUNTIME_OWNER_MISSING` | ไม่มี canonical reputation runtime owner ใน checkpoint นี้ |
| Item/inventory | `itemDefinitionId` และ optional quantity | คืน `SUPPORTED_ITEM_REWARD` เพื่อส่งต่อ owner จริง | ยังไม่ตรวจ item catalog, 40-slot capacity, persistence หรือ event emission ใน contract นี้ |
| Map boundary | `mapId` | ตรวจเฉพาะ `obsidian-frontier`; future map ถูก block ก่อน capability inspection | ไม่เปิด future map/cache/offline write |
| Bounded preview | reward สูงสุด 20 รายการ | เกิน bound ถูก block และไม่ตัดทิ้งโดยอ้างว่าสำเร็จ | ไม่มี runtime mutation หรือ persistence |

## Test evidence

รัน focused command ต่อไปนี้ผ่านแล้ว:

```text
pnpm test -- --run server/questRewardCapabilityBoundary.test.ts
```

ผลจริงจาก Vitest รอบสุดท้ายคือ `121` test files ผ่าน และ `505` tests ผ่าน รวม test ใหม่ `5` กรณี การรัน test script ของ repository ครอบคลุม full suite ด้วย ไม่พบ failed test ในรอบสุดท้าย

## ข้อจำกัดและ non-claims

Checkpoint นี้ไม่แก้ `questRewardDispatchSystem.ts`, quest progression caller, inventory persistence, sync queue, database, event emitter, ability runtime, reputation owner หรือ player UI ไม่สร้าง quest completion/reward/ability/reputation และไม่เรียก network/cache/IndexedDB/database

งานนี้ไม่อ้างว่าปิด T-07 ทั้งหมด ไม่อ้างว่ารางวัลถูกแจกจริง, inventory ถูกบันทึก, quest event ถูก emit, ability/reputation ถูก unlock, authenticated flow ผ่าน หรือ future map ใช้งานได้

`G-04`, `G-05`, `B-06` และ `C-02` ยังมี acceptance gap ระดับ backlog/PR review จึงต้องให้ AI-0 ตรวจ dependency และ merge ตามลำดับก่อนสรุป requirement status

Implementation branch ยังไม่ merge เข้า `main`; AI-0 ต้องตรวจ diff, rerun evidence, merge และปรับ registry/matrix แยกตาม workflow

## สถานะส่งมอบ

- Owner: `AI-6`
- Task ID: `T-07` bounded reward capability-boundary sub-checkpoint
- Branch: `ai-6/t07-reward-capability-boundary`
- Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`
- Implementation commit SHA: `ef79f738407024f004e3a34cf888a32173af175c`
- Status requested: `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ diff และหลักฐานซ้ำ
