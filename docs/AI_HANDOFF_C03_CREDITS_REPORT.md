# C-03 — รายงาน Credits / Supporters Provenance Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `C-03` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับข้อมูล Credits/Supporters และแบ่งสถานะระหว่าง runtime-distributable กับ reference-only อย่างชัดเจน. งานนี้อ่าน provenance source จริงโดยไม่แก้ `assetProvenance.ts` ที่มี reservation อยู่, ไม่แก้ player UI และไม่อ้างว่า Credits navigation หรือ contact workflow พร้อมใช้งานแล้ว

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| canonical `ASSET_CREDITS` | จำนวน, unique asset ID, category และ status | ตรวจ credit records `3` รายการ; unique asset IDs `3/3`; categories คือ `tool`, `tree`, `terrain`; statuses คือ project-original `1` และ reference-only `2` | duplicate/invalid ID, category หรือ status เป็น required blocker | focused C-03 suite ผ่าน 1 file / 6 tests |
| runtime eligibility | `canDistributeAsset` และสถานะที่อนุญาต | distributable `1` รายการ คือ project-original pack; license-verified `0`; reference-only `2` รายการไม่ distributable | `awaiting-contact` และ `reference-only` ห้ามถูก publish/runtime distribute จนกว่าหลักฐานจะครบ | canonical test ยืนยัน distributable `1`, reference-only `2`, graph valid |
| reference disclosure | source URL/label, license, creator, attribution | reference rows มี source URL/label, license, creator และ attribution ครบ; project-original row มี project license/attribution | missing source/license/title/creator/attribution ทำให้ graph fail-closed; ไม่มีการรับ unknown license เป็น runtime | invalid fixture พบ disclosure blockers ตามที่คาด |
| awaiting-contact boundary | Supporters/creator contact state | synthetic awaiting-contact row ที่มี source/label/license ถูกยอมรับเป็น non-distributable และ issue-free | source ปัจจุบันไม่มี awaiting-contact record และยังไม่มี contact form/workflow จริง | test awaiting-contact ผ่านและยืนยัน distributable `0` |
| Credits/Supporters UI boundary | navigation/display readiness | summary ระบุ `creditsUiNavigationPresent: false` และ `supportersContactWorkflowPresent: false` อย่างตรงไปตรงมา; adapter เป็น audit-only | ยังไม่มีการแก้ player page, hidden navigation, detail display หรือ contact submission | test ยืนยัน UI flags เป็น false; ไม่มี browser/UI claim |
| central dependency graph | deterministic hash, required blockers และ runtime boundary | graph ใช้ `validateGeneratorDependencyGraph`; source hash เปลี่ยนเมื่อ provenance เปลี่ยน; runtime policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | invalid rows สร้าง required missing dependency; ไม่มี runtime publish/cache/offline/DB write | tests determinism, hash sensitivity, duplicate/status/disclosure blockers และ bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/creditsSupportersDependencyGraph.ts` | เพิ่ม pure C-03 adapter สำหรับตรวจ credit identity/disclosure/status และ runtime/reference-only eligibility พร้อม deterministic graph/artifact |
| `server/creditsSupportersDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ current split, awaiting-contact, disclosure blockers, duplicate/status, hash sensitivity และ bounds |
| `docs/AI_HANDOFF_C03_CREDITS_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/data/assetProvenance.ts` ซึ่งอยู่ใน PR #10 reservation, ไม่มีการแก้ `client/src/pages/ArcaneFrontier.tsx` หรือ player UI, Workbench/router, asset manifest/binary, map allow-list/cache/offline persistence, authority/auth/schema/migration หรือ runtime publish. ไม่มีการสร้าง PNG/GLB/texture/model, ไม่มี external generation, ไม่มี secret/token และไม่มีการส่งข้อมูล contact จริงออกไป

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `C-03` |
| Requirement | hidden Credits/Supporters with runtime/reference-only split |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/credits-provenance-c03` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `13d11a8a75cd891d27fdffd3d6c960da17e25740` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/creditsSupportersDependencyGraph.ts`, `server/creditsSupportersDependencyGraph.test.ts`, `docs/AI_HANDOFF_C03_CREDITS_REPORT.md` |
| Implementation commit | `9331dc51e6e8e5c22bb9b1eae39d7d05cefa3ba5` (`9331dc5`) |
| Remote branch | `origin/ai-2/credits-provenance-c03` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean ก่อนรายงาน commit; implementation `git diff --check` ผ่าน |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused C-03 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `114` test files / `466` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต C-03 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ provenance source ปัจจุบันแยก project-original ที่ runtime distribute ได้ `1` รายการออกจาก reference-only ที่ distribute ไม่ได้ `2` รายการ และมี field สำหรับ title, creator, source, license และ attribution ที่ audit ได้. Pure graph ยังรักษา runtime boundary ไม่ให้ preview กลายเป็น player control หรือ asset publish

Checkpoint นี้ยังไม่ปิด C-03 ทั้งข้อเป็น `VERIFIED`. ยังไม่มี hidden Credits navigation ใน player UI, ยังไม่มี Credits/Supporters detail display, ยังไม่มี contact form/submission workflow, ยังไม่มี browser/mobile visual acceptance และไม่ได้แก้ source owner ที่ถูกจองโดย PR #10. การตรวจนี้จึงเป็น provenance/data-contract evidence เท่านั้น ไม่ใช่การประกาศว่า Credits/Supporters feature พร้อมใช้งานครบ

AI-0 ควรตรวจ diff ของ commit `9331dc5`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องเพิ่ม navigation, display หรือ contact workflow ให้เปิด checkpoint UI แยกพร้อม exact reservation ใหม่ โดยไม่แก้ไฟล์ที่ PR #10 หรือ owner อื่นจองอยู่
