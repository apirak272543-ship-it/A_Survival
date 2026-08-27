# TASK CLAIM

Task ID: `T-07` (bounded reward capability-boundary sub-checkpoint)

Owner: `AI-6`

Branch/worktree: `ai-6/t07-reward-capability-boundary` / `/home/ubuntu/A_Survival`

Base SHA: `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`

Files reserved:

- `server/generators/questRewardCapabilityBoundary.ts`
- `server/questRewardCapabilityBoundary.test.ts`
- `docs/AI_CLAIM_T07_REWARD_CAPABILITY_BOUNDARY.md`
- `docs/AI_HANDOFF_T07_REWARD_CAPABILITY_BOUNDARY_REPORT.md`

Status: `AVAILABLE -> RESERVED -> IN_PROGRESS`

Forbidden scope acknowledged: `yes`

ขอบเขตนี้เป็น bounded pure/read-only contract สำหรับจำแนก reward capability ที่มี owner จริงออกจาก ability/reputation reward ที่ยังไม่มี canonical runtime owner โดย fail-closed และใช้ reason code ที่ตรวจซ้ำได้ จะไม่แก้ quest progression/dispatch caller, ไม่ fabricate quest completion/reward/ability/reputation, ไม่เขียน persistence/database/cache และไม่เปิด future map

Dependency note: T-07 ยังมี dependency/acceptance gap ระดับ inventory, item detail และ generator integration; checkpoint นี้จึงเป็น capability-boundary slice เท่านั้น ไม่อ้างว่าปิด reward transaction หรือ T-07 ทั้งหมด
