# AI-3 Q-03 Validation Evidence

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `Q-03` |
| Requirement | run test/check/build/browser evidence before report |
| Owner | AI-3 |
| Branch/worktree | `ai3/q03-validation-evidence` / `/home/ubuntu/A_Survival-q03` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-q03-validation-evidence.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Validation matrix from completed AI-3 checkpoints

| Checkpoint | Focused evidence | Full evidence | External handoff |
|---|---|---|---|
| `O-01` | `git diff --check`, `pnpm check` | docs-only; no runtime bundle | commit `1a54efc956f4b3687fb5bdc2720f7dcf44d0ba70`, PR [#40](https://github.com/apirak272543-ship-it/A_Survival/pull/40) |
| `V-03` | asset manifest focused tests | `pnpm check`, `121` files / `483` tests, heap-limited build | commit `d787bed86d0e13f1049f05eb4bdd40ce21de4b29`, PR [#43](https://github.com/apirak272543-ship-it/A_Survival/pull/43) |
| `M-03` | `node --check client/public/sw.js`; `1` file / `2` tests | `pnpm check`, `121` files / `502` tests, heap-limited build | commit `56dd62184533afa06e7a9416030ef09b58d57dfa`, PR [#46](https://github.com/apirak272543-ship-it/A_Survival/pull/46) |
| `B-01` | `1` file / `3` tests | `pnpm check`, `121` files / `503` tests, heap-limited build | commit `16eea3835b5b01327b91e2421d9aba3385eb9165`, PR [#49](https://github.com/apirak272543-ship-it/A_Survival/pull/49) |
| `O-05` | `git diff --check`, `pnpm check` | docs-only; no runtime bundle | commit `aec555c1d714c7d376dff0ac705ad114048ebe94`, PR [#50](https://github.com/apirak272543-ship-it/A_Survival/pull/50) |
| `V-02` | `1` file / `4` tests | `pnpm check`, `121` files / `504` tests, heap-limited build | commit `4bc4a8a68f306f08a13a8ca72124cc9ad796b7f7`, PR [#52](https://github.com/apirak272543-ship-it/A_Survival/pull/52) |
| `Q-02` | repository grep and manifest/provenance inspection | docs-only; `pnpm check` | commit `1dd23055dfaefa6399e3545b782bb4c9ee41c16b`, PR [#53](https://github.com/apirak272543-ship-it/A_Survival/pull/53) |
| `S-01` | `1` file / `4` tests | `pnpm check`, `121` files / `504` tests, heap-limited build | commit `06e686af98975fd7bb2465878492f520d7a56a49`, PR [#55](https://github.com/apirak272543-ship-it/A_Survival/pull/55) |
| `S-02` | `1` file / `3` tests | `pnpm check`, `121` files / `503` tests, heap-limited build | commit `ec7b27ba7dc0bb88c1076a87dc2313c4f9833d58`, PR [#57](https://github.com/apirak272543-ship-it/A_Survival/pull/57) |

## Validation policy

ทุก code checkpoint ใช้ลำดับ focused test → `pnpm check` → `git diff --check` → full test suite → heap-limited production build เมื่อ scope กระทบ client/server bundle. Docs-only checkpoint ใช้ source-of-truth audit, `git diff --check` และ `pnpm check` โดยไม่อ้าง runtime behavior ที่ไม่ได้เปลี่ยน. Build warnings ที่เกิดซ้ำคือ analytics environment placeholders ที่ไม่ได้กำหนด, analytics script ไม่มี `type="module"` และ Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB; warnings เหล่านี้ถูกบันทึกแทนการซ่อน.

`pnpm test -- --run` ถูกใช้เพื่อรัน full Vitest suite และจำนวน tests ถูกบันทึกตามแต่ละ base จริง. Browser, real-device, WebView, authenticated E2E, offline airplane-mode และ production deployment ไม่ถูกสรุปว่า passed เว้นแต่มี evidence เฉพาะของ checkpoint นั้น.

## Scope and limitations

รายงานนี้เป็น process/evidence index ไม่ใช่การเปลี่ยน requirement matrix เป็น `VERIFIED` และไม่ใช่การตรวจรับหรือ merge PR. PR ทั้งหมดต้องให้ AI-0 ตรวจ base SHA, exact files, diff, test/build output, dependency, invariant และข้อจำกัดก่อน. หลักฐานนี้ไม่เพิ่ม browser screenshot หรือ device evidence ที่ไม่มีอยู่จริง และไม่อ้าง global/master-spec complete.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `Q-03` |
| Requirement | `Q-03` |
| Owner | AI-3 |
| Branch | `ai3/q03-validation-evidence` |
| Commit SHA | `a15def105d2673bbe8fd24a5cb2309cced52d1a1` |
| Files changed | `docs/evidence/ai3-q03-validation-evidence.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | validation matrix แยก focused/full/build/browser limitations และไม่ใช้คำกล่าวอ้างที่ไม่มีหลักฐาน |
| Blockers/limitations | AI-0 review/merge ยังจำเป็น; browser/device/authenticated/production evidence แตกต่างกันตาม checkpoint |
| Merge request | PR จะใช้ชื่อ `[AI-3][Q-03]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และหลักฐาน |
