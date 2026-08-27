# AI-3 M-01 Viewport Acceptance Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `M-01` |
| Requirement | landscape mobile, safe area, fullscreen, touch controls |
| Owner | AI-3 |
| Branch/worktree | `ai3/m01-viewport-acceptance-contract` / `/home/ubuntu/A_Survival-m01` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/viewportAcceptanceContract.ts`, `server/viewportAcceptanceContract.test.ts`, `docs/evidence/ai3-m01-viewport-acceptance-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure `validateMobileViewportPolicy` และ `validateMobileViewportMatrix` สำหรับตรวจ output จาก `normalizeMobileViewport`. Contract ตรวจ width/height ที่วัดได้, orientation conflict, non-negative safe-area insets, usable space ที่ไม่เกิน viewport, `canvasFit=cover`, layout recommendation ที่สอดคล้องกับ orientation และ touch capability. Matrix gate บังคับ coverage widths `320`, `390`, `430` และ `768` ตาม acceptance requirement.

Checkpoint นี้ไม่แก้ responsive CSS/meta viewport, fullscreen API, orientation lock, touch event handler, safe-area CSS variables, device hardware หรือ browser route. `fullscreenGuaranteed`, `realDeviceAcceptance` และ `webViewAcceptance` จึงยังคง false ตาม source policy; contract ไม่สร้าง device claim.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/viewportAcceptanceContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `4` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `504` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Width matrix | 320/390/430/768 ถูกตรวจครบ |
| Safe area | measured non-negative integer insets และ usable dimensions ถูกตรวจ |
| Orientation/touch | conflict และ touch-not-ready ถูก reject |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี UI/event integration |
| Real-device acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations and blockers

M-01 ตาม backlog ยังขึ้นกับ S-02 และต้องการ 320/390/430/768 plus device evidence. Contract นี้เป็น acceptance policy slice ไม่ใช่การรับรอง CSS, fullscreen, touch gesture, notch safe-area จริง, landscape lock หรือ WebView. AI-0 ต้องตรวจ integration owner และ browser/device evidence ก่อน merge.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `M-01` |
| Requirement | `M-01` bounded viewport acceptance sub-checkpoint |
| Owner | AI-3 |
| Branch | `ai3/m01-viewport-acceptance-contract` |
| Commit SHA | `1359a308bbdc1741e64cf03ac6a15e053c0e4b98` |
| Files changed | `server/viewportAcceptanceContract.ts`, `server/viewportAcceptanceContract.test.ts`, `docs/evidence/ai3-m01-viewport-acceptance-contract.md` |
| Checks | focused `1/4`, `pnpm check`, full `121` files / `504` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | bounded viewport/safe-area/touch acceptance contract และ required width matrix gate |
| Blockers/limitations | ไม่มี CSS/fullscreen/touch runtime integration และไม่มี device/browser evidence; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][M-01]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ build |
