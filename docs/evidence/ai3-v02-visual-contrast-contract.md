# AI-3 V-02 Scene Visual Contrast Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `V-02` |
| Requirement | ไม่ใช้พื้นแบนหรือ glow กลืน player/pet/enemy |
| Owner | AI-3 |
| Branch/worktree | `ai3/v02-visual-contrast-contract` / `/home/ubuntu/A_Survival-v02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/sceneVisualContrastContract.ts`, `server/sceneVisualContrastContract.test.ts`, `docs/evidence/ai3-v02-visual-contrast-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure, deterministic และ bounded `validateSceneVisualContrast` สำหรับตรวจ scene treatment ที่มีผลต่อการอ่าน terrain และวัตถุในฉาก. Contract แปลงสี `#RRGGBB` เป็นระยะห่าง normalized ระหว่าง terrain/sky และ terrain/light, ตรวจ light intensity ให้อยู่ในขอบเขต และป้องกัน glow intensity ที่สูงเกินไป. `validateSceneVisualContrastSet` เรียง map IDs ก่อนตรวจเพื่อให้ output และ blocker list ทำซ้ำได้.

Contract นี้เป็น **audit/required-blocker boundary** ไม่ใช่การอ้างว่า visual acceptance ผ่านทั้งหมด. เมื่อรันกับ treatment ปัจจุบัน พบ active `obsidian-frontier` ผ่าน contrast gate แต่พบ 5 treatment ที่ terrain/sky contrast ต่ำกว่า threshold `0.05`: `map-005-corrosive-acid-swamps`, `map-007-frozen-obsidian-crevasses`, `map-012-obsidian-spire-shelf`, `map-014-magma-trench-bastion` และ `map-015-heart-of-the-crucible`. รายการเหล่านี้จึงถูกเปิดเผยเป็น blocker ที่ตรวจซ้ำได้ แทนการแก้สีหรืออ้างว่าผ่านโดยไม่มี visual review.

Checkpoint นี้ไม่แก้ `scene.ts`, ไม่แก้ binary/texture, ไม่แตะ player controls, map allow-list, cache/offline หรือ creator UI. การปรับ treatment จริงและการตรวจ screenshot/browser เป็น checkpoint แยกที่ต้องมี owner และ evidence เหมาะสม.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/sceneVisualContrastContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `4` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `504` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Active map | `obsidian-frontier` ผ่าน terrain/sky และ terrain/light contrast |
| Current treatment set | deterministic audit พบ 5 low terrain/sky contrast blockers ตามรายการด้านบน |
| Malformed input | สีไม่ใช่ `#RRGGBB`, intensity ไม่ถูกต้อง และ glow สูงเกินไปถูก reject |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี render-loop integration |
| Binary assets | ไม่ได้สร้าง แก้ไข หรือนำเข้า |
| Device/mobile acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

Contract นี้ตรวจ color metadata และ policy threshold ไม่ใช่การวัด readability จาก rendered screenshot หรือ device จริง. ยังไม่มีการปรับ scene treatment, material, lighting, player/pet/enemy mesh หรือ glow asset ดังนั้น blocker 5 รายการยังคงต้องแก้และตรวจด้วย visual evidence ในภายหลัง. Checkpoint นี้ไม่ทำให้ V-02 กลายเป็น `VERIFIED` หรือทำให้ global/master spec complete.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `V-02` |
| Requirement | `V-02` |
| Owner | AI-3 |
| Branch | `ai3/v02-visual-contrast-contract` |
| Commit SHA | `6ae61a1b953d1c822dd2f389ddd403f629c7d773` |
| Files changed | `server/sceneVisualContrastContract.ts`, `server/sceneVisualContrastContract.test.ts`, `docs/evidence/ai3-v02-visual-contrast-contract.md` |
| Checks | focused `1/4`, `pnpm check`, full `121` files / `504` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | มี deterministic contrast audit และ required blocker list สำหรับ scene treatment โดย active Obsidian treatment ผ่าน |
| Blockers/limitations | 5 treatment ยัง low contrast; ไม่มี rendered visual/device acceptance; ต้อง review โดย AI-0 |
| Merge request | PR จะใช้ชื่อ `[AI-3][V-02]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff, tests และ build |
