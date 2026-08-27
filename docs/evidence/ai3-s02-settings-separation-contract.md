# AI-3 S-02 Settings Separation Contract

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `S-02` |
| Requirement | separate global vs in-map settings |
| Owner | AI-3 |
| Branch/worktree | `ai3/s02-settings-separation-contract` / `/home/ubuntu/A_Survival-s02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/settingsSeparationContract.ts`, `server/settingsSeparationContract.test.ts`, `docs/evidence/ai3-s02-settings-separation-contract.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม pure, deterministic `splitSettingsRecord` และ `validateSettingsSeparation` เพื่อแยก global settings ออกจาก in-map settings อย่างชัดเจน. Global set ครอบคลุม language, quality, performance/effect/audio, reduced motion, render distance, camera default และ touch scale/opacity. In-map set ครอบคลุม `cameraMode`, `viewDistanceBlocks` และ `targetFps`.

Unknown keys จะถูกเก็บใน `unknownKeys` เพื่อให้ review ต่อ ไม่ถูก silently assign เข้า global หรือ in-map. Validator จะ reject เมื่อ in-map key ปรากฏใน global record หรือ global key ปรากฏใน in-map record. Default contract ใช้ `DEFAULT_SETTINGS` และ `DEFAULT_IN_MAP_SETTINGS` เป็น source ของค่าตั้งต้น แต่ไม่แก้ persistence caller ใน `session.ts`.

Checkpoint นี้ไม่แก้ UI, pause/focus behavior, localStorage schema, IndexedDB, camera bridge, map policy หรือ creator controls. เป็น policy boundary slice; การนำไปใช้จริงกับ global/in-map persistence และทุก entry route ต้องเปิด reservation แยก.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `pnpm exec vitest run server/settingsSeparationContract.test.ts --reporter=verbose` | ผ่าน `1` test file / `3` tests |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `503` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| `git diff --check` | ผ่านหลัง validation และต้องรันซ้ำก่อน commit |
| Default split | global/in-map keys แยกครบและ deterministic |
| Unknown boundary | unknown key ถูกเก็บเพื่อ review ไม่ถูก assign silently |
| Cross-boundary | cameraMode/targetFps ใน global และ quality ใน in-map ถูก reject |
| Runtime side effects | ไม่มี network/cache/IndexedDB/database write และไม่มี UI/runtime caller integration |
| Device/mobile acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

Contract นี้ยังไม่เปลี่ยน `getSettings`, `saveSettings`, `normalizeInMapSettings` หรือ UI ให้ใช้ storage แยกกันจริง. จึงไม่พิสูจน์ persistence, pause/focus behavior, migration จาก settings schema เดิม หรือทุก entry route. S-02 ยังมี dependency S-01 และ M-01 ตาม backlog และต้องให้ AI-0 ตัดสินใจว่าจะ merge เป็น bounded sub-checkpoint หรือรอ integration เพิ่ม.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `S-02` |
| Requirement | `S-02` |
| Owner | AI-3 |
| Branch | `ai3/s02-settings-separation-contract` |
| Commit SHA | `451a9fcf304163c349185bdb8c75f30b15016c5a` |
| Files changed | `server/settingsSeparationContract.ts`, `server/settingsSeparationContract.test.ts`, `docs/evidence/ai3-s02-settings-separation-contract.md` |
| Checks | focused `1/3`, `pnpm check`, full `121` files / `503` tests, `git diff --check` และ heap-limited build ผ่าน |
| Result | bounded deterministic contract แยก global และ in-map settings พร้อม unknown-key review boundary |
| Blockers/limitations | ไม่มี persistence/UI integration และไม่มี device acceptance; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][S-02]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff, tests และ build |
