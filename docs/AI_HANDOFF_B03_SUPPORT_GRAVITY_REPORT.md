# B-03 — รายงาน Block Support / Gravity / Float Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `B-03` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับ support, gravity และ float semantics จาก canonical `OBSIDIAN_BLOCKS` และ runtime physics contract จริง. ตรวจ definition identity, solid/non-`none` collision support, adjacent-neighbor offsets, broken-state exclusion, terrain-support callback, placement rejection, gravity/float consistency และ runtime-owner boundary โดยไม่แก้ block runtime owner

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| block definitions | canonical `OBSIDIAN_BLOCKS`, definition IDs และจำนวนรายการ | ตรวจครบ `14` definitions และ `14` unique IDs; sample graph จำกัดตาม `sampleCount` สูงสุด `32` | key/id mismatch หรือ duplicate definition ID เป็น required blocker | focused B-03 suite ผ่าน 1 file / 5 tests; canonical count/identity test ผ่าน |
| support predicate | นิยาม block ที่ใช้ค้ำ | source ใช้ `solid && collisionShape !== "none"`; canonical มี `10` solid-support definitions และ `4` non-solid definitions | support predicate เปลี่ยนหรือขาดเป็น blocker; ไม่สร้าง rule ใหม่ทับ source | canonical summary และ malformed predicate test ผ่าน |
| placement support | adjacent support และ placement failure | source ตรวจ neighbor 6 ทิศ: down, ±x, ±z, up; unsupported non-floating block ใช้ reason `requires-support`; terrain callback ได้รับอนุญาต | adjacency ผิด, terrain callback หาย หรือ rejection reason ผิดเป็น blocker | semantics test ตรวจ offsets ครบ 6, broken exclusion, callback และ reason |
| broken state | block ที่แตกแล้วไม่เป็น support | source physics `isSupportBlock` ตัด `state === "broken"` ออก; audit บังคับ `brokenStateExcluded: true` | หาก broken block ยังนับเป็น support เป็น blocker | semantics test และ invalid fixture ตรวจ `broken-state-not-excluded` |
| gravity | gravityAffected กับ canFloat/requiresSupport | canonical มี `gravityAffected: 1`; ไม่มี gravity/float contradiction และ gravity block ที่ขาด support rule; gravity target ต้อง non-floating | gravity+float contradiction หรือ gravity block ไม่ requires support เป็น blocker | canonical summary ผ่าน; invalid fixture สร้างทั้ง `gravity-float-contradiction` และ `gravity-support-rule-missing` |
| float policy | blocks ที่ลอยได้ | canonical มี `4` floatable definitions; audit แยก float semantics จาก solid support ไม่ fabricate physics | float flag inconsistency เป็น blockerผ่าน gravity rules | canonical count test ผ่าน |
| runtime owner | physics/placement integration boundary | source runtime owner อยู่ใน `blockPhysicsSystem.ts` และ action/scene callers; audit เป็น read-only ไม่ mutate world | ยังไม่มี end-to-end placement/reload/browser evidence ใน checkpoint นี้ | `runtimeOwnerPresent: true`; graph runtime policy ปิด |
| central dependency graph | deterministic hash, required blockers และ runtime policy | graph ใช้ `validateGeneratorDependencyGraph`; malformed source สร้าง missing required dependencies; policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | audit output ไม่ใช่ runtime mutation, world persistence หรือ player control | tests determinism, hash sensitivity, blockers และ bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/blockSupportGravityDependencyGraph.ts` | เพิ่ม pure B-03 adapter สำหรับ block support/gravity/float audit และ fail-closed dependency graph |
| `server/blockSupportGravityDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical counts, physics semantics, malformed rules, hash และ bounds |
| `docs/AI_HANDOFF_B03_SUPPORT_GRAVITY_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/data/blockModules.ts`, `client/src/game/systems/blockPhysicsSystem.ts`, `blockWorldSystem.ts`, `blockInteractionSystem.ts`, `blockActionSystem.ts`, AI-1 PR #22 hazard files, Workbench/router, map/cache/offline/authority/schema หรือ registry/matrix. ไม่มี block mutation, world persistence, asset generation, secret/token หรือ DB write

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `B-03` |
| Requirement | support/gravity/float rule registry |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/block-support-b03` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `bdb014f48688702207d77e0d404d81e128baf8a3` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/blockSupportGravityDependencyGraph.ts`, `server/blockSupportGravityDependencyGraph.test.ts`, `docs/AI_HANDOFF_B03_SUPPORT_GRAVITY_REPORT.md` |
| Implementation commit | `255a351aa4b02330dc989643b9dd8039a3d0bfdb` (`255a351`) |
| Remote branch | `origin/ai-2/block-support-b03` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Recovery note | ระหว่าง validation รอบแรก `origin/main` ขยับจาก claim base `ed16044...` เป็น `bdb014f...`; จึงสร้าง branch ใหม่จาก base ล่าสุดและ cherry-pick เฉพาะ B-03 implementation โดยไม่ force push/reset/revert |
| Git status | clean หลัง push; implementation `git diff --check` ผ่าน |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริงบน branch corrected fresh base |
|---|---|
| Focused B-03 suite | ผ่าน `1` test file / `5` tests |
| Full test suite | ผ่าน `118` test files / `488` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต B-03 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ canonical block catalog มี support/gravity/float fields ครบทั้ง `14` definitions, support predicate เป็น solid/non-`none` collision, placement ใช้ adjacent support 6 ทิศและ terrain callback, broken blocks ไม่ค้ำ, unsupported non-floating blocks ถูกปฏิเสธด้วย `requires-support`, และ canonical gravity flags ไม่มี contradiction. Invalid definitions/policies ไม่ถูกกลบ แต่กลายเป็น required graph blockers

Checkpoint นี้ยังไม่ปิด B-03 ทั้งข้อเป็น `VERIFIED` เพราะยังไม่ได้ทำ end-to-end browser placement, cross-reload world persistence, universal support/gravity behavior ในทุก generated-world case หรือ mobile/device acceptance. งานต่อยอด runtime mutation/persistence ต้องเปิด checkpoint ใหม่พร้อม exact reservations และห้ามนำ pure graph output ไปเป็น player control โดยตรง

AI-0 ควรตรวจ diff ของ commit `255a351`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องขยาย B-03 ให้ครอบคลุม placement mutation หรือ world persistence ให้แยก owner และรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
