# AI-3 S-01 Camera Acceptance Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `S-01` |
| Requirement | first-person/overhead/side camera choice in-map |
| Owner | AI-3 |
| Branch/worktree | `ai3/s01-camera-acceptance-contract` / `/home/ubuntu/A_Survival-s01` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/cameraAcceptanceContract.ts`, `server/cameraAcceptanceContract.test.ts`, `docs/evidence/ai3-s01-camera-acceptance-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure, deterministic `validateCameraAcceptanceProfiles` ที่ยืนยันว่ากล้องที่ผู้เล่นเลือกได้มีครบ `overhead`, `first-person` และ `side`, แต่ละ mode มี pose ที่ finite และอยู่ในขอบเขต FOV/radius/height, ระบุ player visibility/terrain readability อย่างชัดเจน, มี touch-friendly intent และมี purpose ที่ user-facing.

สัญญานี้กำหนด semantic boundary ว่า first-person ไม่แสดงตัวผู้เล่นจากมุมกล้องเดียวกัน ส่วน overhead และ side ต้องรักษา player visibility intent. Duplicate/missing mode, pose ผิดขอบเขต, visibility semantics ผิด, touch intent หาย และ purpose ว่างถูก reject แบบ fail-closed.

Checkpoint นี้ไม่แก้ `cameraModes.ts`, `scene.ts`, `GameCanvas`, CSS, orientation lock, touch handler หรือ map policy. จึงไม่อ้างว่า camera interaction บน iOS/Android/WebView ผ่านแล้ว; เป็น policy/acceptance contract slice ที่ใช้เป็น gate ก่อน browser/device acceptance.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/cameraAcceptanceContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `4` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `504` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Mode coverage | overhead, first-person และ side ครบ |
| Pose coverage | finite alpha/beta/radius/height/FOV และ bounded FOV `0.6..1.2` |
| Intent coverage | player visibility, terrain readability, touch-friendly และ purpose ถูกตรวจ |
| Malformed coverage | duplicate/missing/invalid intent ถูก reject |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี render-loop integration |
| Real-device acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

Contract นี้ไม่สามารถแทนการทดสอบ interaction จริงของ camera, touch gesture, collision, safe-area, orientation หรือ WebView ได้ และไม่ได้แก้ caller ให้ใช้ profile โดยอัตโนมัติ. การปิด S-01 เต็มรูปแบบยังต้องตรวจ browser/device evidence และ owner ของ `cameraModes.ts`, in-map settings และ camera bridge.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `S-01` |
| Requirement | `S-01` |
| Owner | AI-3 |
| Branch | `ai3/s01-camera-acceptance-contract` |
| Commit SHA | `f62990a11a1cefcaa7da32040f1548e4de738d7a` |
| Files changed | `server/cameraAcceptanceContract.ts`, `server/cameraAcceptanceContract.test.ts`, `docs/evidence/ai3-s01-camera-acceptance-contract.md` |
| Checks | focused `1/4`, `pnpm check`, full `121` files / `504` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | bounded camera mode acceptance contract พร้อม semantic visibility/touch intent |
| Blockers/limitations | ไม่มี runtime caller integration และไม่มี real-device/WebView acceptance; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][S-01]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff, tests และ build |
