# A_Survival AI Coordination Registry

เอกสารนี้เป็น **ทะเบียนกลางของการแบ่งงานและการจองไฟล์** สำหรับ AI สามตัวใน Repository `apirak272543-ship-it/A_Survival` โดย AI-0 เป็นผู้ประสานงานหลักและผู้ตรวจรับบน `main` ทุกสถานะต้องอ้างอิงจาก repository, branch, commit, diff และผลตรวจจริง ไม่ใช่จากข้อความในแชตเพียงอย่างเดียว. รายการงานครบทั้ง 52 ข้ออยู่ใน [`AI_COORDINATION_BACKLOG.md`](./AI_COORDINATION_BACKLOG.md); ไฟล์นี้เก็บกติกา lock และงานที่กำลังถืออยู่ ส่วน backlog เก็บ queue ที่ AI ทั้งสามเลือกได้

> กฎสั้น: อ่านทะเบียนก่อนแก้ทุกครั้ง, ห้ามแตะไฟล์ที่มี owner อื่นจองอยู่, ห้าม push ตรงเข้า `main` จาก AI-1/AI-2, และห้ามเปลี่ยนสถานะเป็นสีเขียวจนกว่าจะมี commit SHA กับผลตรวจที่ตรวจซ้ำได้

## สถานะกลาง

| เครื่องหมาย | สถานะ | ความหมาย |
|---|---|---|
| 🟢 DONE | เสร็จและตรวจรับแล้ว | มี commit ที่ระบุได้, diff อยู่ใน scope, tests/check/build ตามความเหมาะสมผ่าน และ AI-0 ตรวจรับแล้ว |
| 🔵 IN_PROGRESS | กำลังทำ | มี owner และมีไฟล์ที่จอง ห้าม AI อื่นแก้ไฟล์เดียวกัน |
| 🟡 RESERVED | จองแล้ว รอเริ่มหรือรอส่งหลักฐาน | owner รับงานแล้ว แต่ยังไม่มีหลักฐานเสร็จครบ |
| 🔴 BLOCKED | ติด blocker | ห้ามแก้ด้วยการเดาหรือปิด blocker; ต้องรายงานเหตุผลและ dependency ที่ขาด |
| ⚪ WAITING_EVIDENCE | อ้างว่าทำแล้วแต่ repository ยังไม่มีหลักฐานรับงาน | ต้องส่ง branch/PR/SHA/diff/test summary ก่อน AI-0 จะเปลี่ยนเป็น DONE |
| ⬜ AVAILABLE | ยังไม่มี owner | AI-0, AI-1 หรือ AI-2 เลือกได้ตาม autonomous worker instructions แต่ต้อง claim และลงทะเบียนก่อนเริ่ม |

## สถานะ repository ณ 2026-08-27

| รายการ | ค่าที่ตรวจได้ |
|---|---|
| Repository | `apirak272543-ship-it/A_Survival` |
| Branch หลัก | `main` |
| Latest integration checkpoint | `33778bd5e643efad402e47c60880b01c0a0718b3` (docs correction: Codex UI boundary plus matrix status reconciliation) |
| Recovery ref ที่ต้องรักษา | `local-recovery-46a4812 -> 46a48125ab0377063cbad77bdd46edb864cc70c2` |
| Stash | ว่าง ณ การตรวจล่าสุด |
| Dev/test process | Codex smoke tree ถูก TERM แล้วและ port `3000` ไม่ listen; old watcher PID `505664` ยังอยู่บน `127.0.0.1` จากก่อนหน้าและไม่ได้แตะต้องเพราะไม่ใช่ smoke tree ที่ยืนยัน |
| สถานะล่าสุด | C-01 Codex UI boundary implementation `1085ac2` และ docs/matrix correction `33778bd` ถูก push แล้ว; browser smoke หลักฐานอยู่ใน `docs/evidence/codex-ui-boundary-browser.md`; open worker PRs #9–#28 พบจาก GitHub แต่ยังไม่มีรายการใดถูก merge/รับเข้า main |

## Open worker PR review queue

พบ open PR ของ AI-1/AI-2 หมายเลข `#9` ถึง `#28` จาก GitHub ในการ audit หลัง C-01 checkpoint. รายการเหล่านี้เป็น external branches ที่ต้องตรวจ base SHA, task claim, exact files, diff, tests และ invariant ทีละรายการ; ยังไม่เปลี่ยนเป็น DONE และห้าม merge/cherry-pick อัตโนมัติ. Local clone มีเฉพาะ `origin/main` เป็น remote-tracking branch จึงไม่มีการแก้หรือ reset branch ของ worker.

PR ที่ตรวจ body/files แล้วในรอบนี้ ได้แก่ `#27` S-03 (pure audit พบ blocker high-refresh disclaimer และยังไม่มี browser/device acceptance) และ `#28` O-04 (pure inventory/policy แต่แก้ registry บน base เก่า จึงต้อง rebase/review ก่อนรับ). PR อื่นในช่วง `#9–#26` ยังคงอยู่ใน review queue; ห้ามถือว่าเป็น implementation ที่ main รับรอง.

## ทะเบียนงานและ file reservation

| Task ID | Owner | สถานะ | ขอบเขตและไฟล์ที่จอง | Base/commit evidence | การกระทำถัดไป |
|---|---|---|---|---|---|
| `MAIN-REWARD-INVENTORY-001` | AI-0 / Main Integrator | 🟢 DONE | `server/generators/questRewardInventoryDependencyGraph.ts`, `server/questRewardInventoryDependencyGraph.test.ts`, `server/creatorRouter.ts`, `server/creatorRouter.test.ts`, `client/src/pages/CreatorDomainWorkbench.tsx`, reward inventory browser/docs evidence | Base `d282e8e`; implementation `f9bd3db20d3c7a7044ae147fbb1d24f19ee65e15` | รอออกแบบ checkpoint ใหม่ `NEXT-QUEST-REWARD-DISPATCH-001`; ห้ามตีความ dry-run เป็นการแจก reward จริง |
| `AI1-PERF-001` | AI-1 ตาม autonomous worker | ⬜ AVAILABLE | Performance profile → runtime visibility/telemetry/profiler; ใช้เป็นงานที่เลือกได้จาก backlog ไม่ใช่ข้อจำกัดถาวร; ห้ามแก้ Workbench, router authorization, map/cache/offline/authority หรือไฟล์ใน reservation ของ AI-0 | ยังไม่พบ remote branch หรือ PR ของ AI-1; reservation เดิมถูกปล่อย | AI-1 เลือกได้เมื่อ dependency พร้อม โดยต้องประกาศ claim และ exact files ก่อนเริ่ม |
| `AI2-CONTENT-001` | AI-2 ตาม autonomous worker | ⬜ AVAILABLE | Content generator / plant / asset provenance และ Credits/Supporters provenance; ใช้เป็นงานที่เลือกได้จาก backlog ไม่ใช่ข้อจำกัดถาวร; ห้ามสร้าง PNG/GLB, แก้ Workbench/router, map policy, authority หรือไฟล์ใน reservation ของ AI-0 | ยังไม่พบ remote branch หรือ PR ของ AI-2; reservation เดิมถูกปล่อย | AI-2 เลือกได้เมื่อ dependency พร้อม โดยต้องประกาศ claim และ exact files ก่อนเริ่ม |
| `NEXT-QUEST-REWARD-DISPATCH-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/questRewardDispatchSystem.ts`, `server/generators/questRewardDispatchDependencyGraph.ts`, router/Workbench/tests/evidence ตาม implementation commit | Base `959d3d3`; implementation `333078e3f78e3647ba6643f98b76493dc982b726` | pure item-only atomic transition และ read-only preview ผ่าน; persistence caller, gameplay event emitter, reputation owner และ ability runtime owner ยังเป็น blockers และต้องเปิดงานใหม่แยก reservation |
| `NEXT-QUEST-REWARD-PERSISTENCE-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/home/homeSystemV2.ts` (HomeAction union), `server/syncActionValidation.ts`, `client/src/game/systems/questRewardPendingAction.ts`, `server/questRewardPendingAction.test.ts`, related dependency preview/router/Workbench files only if required | Base `4542ce9`; implementation `05b27c1a16e51f741256d7b08d57e5ee579bb9eb` + semantic follow-up `330593c84bec473fddd6c255171270c73291571a`; files were exclusively reserved by AI-0 | bounded JSON-safe pending action, deterministic provenance pairing and server `questId`↔`questOrder` validation passed `108` files / `428` tests, `pnpm check`, heap-limited build and player/unauthenticated browser boundary; no gameplay caller or persistence mutation was added |
| `NEXT-QUEST-REWARD-PERSISTENCE-INTEGRATION-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/storage/indexedDb.ts`, `client/src/game/systems/questRewardPendingAction.ts`, `server/syncActionValidation.ts`, `server/db.ts`, `server/questRewardPersistenceIntegration.test.ts` | Base `04f2cff`; implementation `f55b154` pushed to `origin/main`; files were exclusively reserved by AI-0 | fail-closed client queue gate and `writeGameSyncBatch` allow-list now accept `quest-reward-dispatch` only through `isSafeQuestRewardDispatchPayload`; malformed new actions return `rejectedIds` and are not queued. Focused `3` files / `16` tests, full `109` files / `431` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; no gameplay caller, reward grant, quest completion, ability/reputation unlock, session UI or future-map write was added |
| `NEXT-PERF-CAPABILITY-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/runtimePerformanceCapability.ts`, `server/runtimePerformanceCapability.test.ts` | Base `5dc54e1`; implementation `937441acb39f28f9d9e0e9f8e41354b23cfe9a3` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure one-time capability normalization/advisory contract ผ่าน focused `3` files / `16` tests, full `110` files / `439` tests, `pnpm check`, `git diff --check` และ heap-limited production build; no render-loop coupling, auto tiering, device benchmark or mobile acceptance claim |
| `NEXT-ASSET-PROVENANCE-001` | AI-0 / Main Integrator | 🟢 DONE | `server/generators/assetProvenanceDependencyGraph.ts`, `server/assetProvenanceDependencyGraph.test.ts` | Base `4ac30ff`; implementation `83bd23e` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure graph adapter เชื่อม sampled item/plant asset IDs กับ active manifest และ credit/provenance records; missing/mismatch เป็น required blockers. Focused `1` file / `5` tests, full `111` files / `444` tests, `pnpm check`, `git diff --check` และ heap-limited production build ผ่าน; no binary asset generation, Workbench/router edit, runtime import/publish or mobile acceptance claim |
| `NEXT-ANIMATION-MOTION-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/animationMotionPolicy.ts`, `server/animationMotionPolicy.test.ts` | Base `ff29617`; implementation `e8d4a9dc4be85a88cc167a84c0f01d569bcc7755` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure distance/visibility/reduced-motion animation policy with full/reduced/sleep/static modes and clip/profile reuse advice; focused `2` files / `11` tests, full `112` files / `452` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; no binary asset, GameCanvas caller, skeleton/retarget/device benchmark, player UI or automatic runtime mutation claim |
| `NEXT-ITEM-DETAIL-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/itemDetailSystem.ts`, `server/itemDetailSystem.test.ts` | Base `845a7a9`; implementation `ea08e4ad2a943dca19981c83669359c449302f5a` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure category-specific detail facts now expose usage/stack, plant soil/effect, placeable block and tool tag from canonical definitions; weapon attack damage remains explicit unavailable because no owning field exists. Focused `3` files / `13` tests, full `112` files / `455` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; no ArcaneFrontier UI, persistence caller, runtime mutation or fabricated combat stat claim |
| `NEXT-WORLD-SPATIAL-001` | AI-0 / Main Integrator | 🟢 DONE | `server/generators/worldSpatialDependencyGraph.ts`, `server/worldSpatialDependencyGraph.test.ts` | Base `c311b98`; implementation `50f17a17f171429ab2f3a7d961659e79ea95921e` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure bounded dependency graph now connects the real Obsidian world generator to `validateGeneratedWorld`, `repairGeneratedWorld` and bounded placement assessments; focused `2` files / `14` tests, full `113` files / `460` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; graph remains read-only and no player generator UI, runtime map selection, future-map write or world persistence claim was added |
| `NEXT-PLANT-ECOLOGY-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/plantEcologyPolicy.ts`, `server/plantEcologyPolicy.test.ts` | Base `7e3a3dd`; implementation `9720ee09c80c6e41d2993ac75aa1ddfef8e00a0c` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure data-driven policy now reads the 300-entry plant catalog for soil/biome/lifecycle compatibility, bounded fictional factor normalization and mature-only semantics; focused `3` files / `15` tests, full `114` files / `466` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; missing nutrient/pest/season runtime owners remain explicit and no real ecology simulation, worldFarmSystem edit, gameplay mutation or player UI claim was added |
| `NEXT-CODEX-DISCOVERY-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/codexDiscoveryContract.ts`, `server/codexDiscoveryContract.test.ts` | Base `9720ee0`; implementation `3decb180d1cae1e9aea55126e01c00c3a34919f4` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure discovered-only contract now normalizes only canonical `CODEX_ENTRIES`, preserves empty state/canonical ordering/category counts, rejects unknown/duplicate inputs and supports a pure union transition; focused `3` files / `12` tests, full `115` files / `472` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; no Codex UI, discovery gameplay caller, session/IndexedDB/network persistence, asset generation or future-map effect was added |
| `NEXT-CREDITS-PROVENANCE-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/creditsPresentationContract.ts`, `server/creditsPresentationContract.test.ts` | Base `c5eaeb9`; implementation `c3a859dd215f128ff32a52d5aeab86d8a08fc5c4` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure contract now separates project-original, license-verified, reference-only and needs-review credit sections from `ASSET_CREDITS`, preserves source URLs/attribution and rejects malformed/duplicate records; focused `2` files / `10` tests, full `116` files / `477` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; no CreditsSheet/player UI edit, runtime asset distribution/publish, persistence write or asset generation was added |
| `NEXT-MOBILE-VIEWPORT-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/game/systems/mobileViewportPolicy.ts`, `server/mobileViewportPolicy.test.ts` | Base `c4d2b1e`; implementation `6745751630589edf84c7be6582e4f4721b9e4bf2` pushed to `origin/main`; files were exclusively reserved by AI-0 | pure bounded policy now normalizes viewport dimensions/orientation conflict/safe-area/touch/fullscreen signals and produces landscape/portrait/unknown layout advice; focused `3` files / `14` tests, full `117` files / `483` tests, `pnpm check`, `git diff --check` and heap-limited production build passed; no `index.css`, `client/index.html`, GameCanvas, CSS safe-area application, orientation lock, real-device/WebView acceptance or player-state write was added |
| `NEXT-CODEX-UI-BOUNDARY-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/pages/ArcaneFrontier.tsx`, `docs/evidence/codex-ui-boundary-browser.md` | Base `b78bf9e`; implementation `1085ac2d4c8c5297bada95f84b270e8e37e17761` pushed to `origin/main`; files were exclusively reserved by AI-0 | `CodexSheet` now consumes `createCodexDiscoverySnapshot`; invalid discovery input fails closed to zero visible entries/category counts, while valid canonical discovered entries retain list/detail behavior. Focused `1` file / `6` tests, full `117` files / `483` tests, `pnpm check`, `git diff --check`, heap-limited build and player browser smoke passed. Browser evidence is saved in `docs/evidence/codex-ui-boundary-browser.md`; no discovery event creator, session/IndexedDB/network write, mobile/device acceptance, creator control or future-map effect was added |
| `NEXT-CREDITS-UI-BOUNDARY-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/pages/ArcaneFrontier.tsx`, `docs/evidence/credits-ui-boundary-browser.md` | Base `388330d`; implementation `f3eea8c80ee86f72ecf2f726ea8aaff5623c9a55` pushed to `origin/main`; files were exclusively reserved by AI-0 | `CreditsSheet` now consumes `createCreditsPresentation(ASSET_CREDITS)` and renders canonical project/licensed/reference-only/needs-review sections; invalid contract input hides entries fail-closed. Focused `1` file / `5` tests, full `117` files / `483` tests, `pnpm check`, `git diff --check`, heap-limited build and player browser smoke passed. Evidence is in `docs/evidence/credits-ui-boundary-browser.md`; no asset bytes, publish, persistence, network write, license approval, mobile/device acceptance, creator control or future-map effect was added |
| `NEXT-ITEM-DETAIL-UI-BOUNDARY-001` | AI-0 / Main Integrator | 🟢 DONE | `client/src/pages/ArcaneFrontier.tsx`, `docs/evidence/item-detail-ui-boundary-browser.md` | Base `a086d57`; implementation `bb51a5572702e023854b1d3d70c5f730a559048c` pushed to `origin/main`; files were exclusively reserved by AI-0 | `ItemDetailSheet` now consumes `getItemCategoryDetail(definition, instance)` and renders canonical usage/stack/category facts; a weapon's attack damage remains explicitly unavailable with the source-owned reason. Focused `1` file / `6` tests, full `117` files / `483` tests, `pnpm check`, `git diff --check`, heap-limited build and player browser long-press smoke passed. Evidence is in `docs/evidence/item-detail-ui-boundary-browser.md`; no fabricated combat stat, persistence, asset generation, creator control, authenticated E2E, real-device acceptance or future-map effect was added |
## Autonomous worker instructions

AI-1 และ AI-2 ได้รับอนุญาตให้ทำงานต่อเนื่องจาก backlog กลางตามไฟล์คำสั่ง [`AI_COMMAND_01_AUTONOMOUS_WORKER_2026-08-27.md`](./AI_COMMAND_01_AUTONOMOUS_WORKER_2026-08-27.md) และ [`AI_COMMAND_02_AUTONOMOUS_WORKER_2026-08-27.md`](./AI_COMMAND_02_AUTONOMOUS_WORKER_2026-08-27.md). รายการเดิม `AI1-PERF-001` และ `AI2-CONTENT-001` เป็นเพียงงานแนะนำที่ถูกปล่อย reservation แล้ว ไม่ใช่การจำกัดสายงาน. ทั้งสองตัวต้องอ่าน backlog ทั้งหมด เลือกเฉพาะ `AVAILABLE`, claim exact files, commit/push branch ตัวเอง และเริ่ม checkpoint ถัดไปหลังส่งหลักฐาน; AI-0 ยังคงเป็นผู้ review/merge และผู้แก้ registry บน `main`

## File ownership rules

AI-0 เป็นเจ้าของ `main` และเป็นผู้เดียวที่ merge หรือแก้ไขทะเบียนนี้หลังตรวจหลักฐานแล้ว. AI-1 และ AI-2 ต้องทำงานบน branch/worktree ของตนเอง เช่น `ai-1/perf-<task-id>` และ `ai-2/content-<task-id>` ห้ามใช้ working tree เดียวกับ AI-0 และห้าม push แบบ force หรือ push ตรงเข้า `main`.

การจองไฟล์ต้องเป็น **exclusive lock** ระหว่าง checkpoint. หากต้องแก้ไฟล์ที่มี owner อื่นจองอยู่ ให้หยุดและส่งคำขอ conflict review ผ่าน PR/issue หรือข้อความถึง AI-0; ห้ามแก้ก่อนอนุมัติ. ไฟล์ที่ไม่ได้อยู่ในขอบเขต handoff ถือเป็น `⬜ AVAILABLE` แต่ไม่ได้แปลว่าแก้ได้ทันที ต้องค้น source of truth และลงทะเบียน task ก่อนเสมอ.

การปิดงานไม่ใช้เพียงคำว่า “เสร็จแล้ว”. สถานะ `🟢 DONE` ต้องมีชื่อ branch, commit SHA, รายการไฟล์, `git diff --check`, `pnpm check`, focused tests และ full tests/build เมื่อ scope กระทบ client/server bundle พร้อมข้อจำกัดที่ยังตรวจไม่ได้. ถ้าไม่มี branch/PR/SHA หรือหลักฐานไม่อยู่ใน repository ให้ใช้ `⚪ WAITING_EVIDENCE` แทน.

## รูปแบบประกาศรับงาน

ก่อนเริ่ม AI-1/AI-2 ต้องส่งข้อความหรือ PR description ตามรูปแบบนี้:

```text
TASK CLAIM
Task ID: AI1-PERF-001 หรือ AI2-CONTENT-001
Owner: AI-1 หรือ AI-2
Branch/worktree: <ชื่อจริง>
Base SHA: <SHA ที่ checkout จาก main>
Files reserved: <รายการไฟล์แบบ exact path>
Status: RESERVED -> IN_PROGRESS
Forbidden scope acknowledged: yes
```

## รูปแบบรายงานปิดงาน

```text
TASK COMPLETE
Task ID: <task id>
Owner: <AI-1/AI-2>
Branch: <ชื่อ branch>
Commit SHA: <full SHA>
Files changed: <รายการไฟล์>
Checks: git diff --check; pnpm check; focused tests; full tests/build ตาม scope
Result: <สิ่งที่พิสูจน์ได้>
Blockers/limitations: <สิ่งที่ยังไม่ผ่าน>
Merge request: <PR URL หรือยังไม่เปิด>
Status requested: GREEN / DONE หรือ RED / BLOCKED
```

AI-0 จะตรวจ claim และ completion report กับ source จริงก่อนแก้แถวสถานะเป็นสีเขียว. การ merge ต้องเป็น checkpoint แยก, matrix SHA correction ต้องเป็น docs commit แยก และทุกคนต้องรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ selectable/playable/cache-eligible/offline-write ได้.

## ช่องทางสื่อสารเมื่อไม่ใช้ไฟล์ handoff

Repository นี้ไม่มีช่องแชตภายในระหว่าง AI โดยอัตโนมัติ. ช่องทางที่ใช้งานแทนได้คือ GitHub branch/PR/issue comment โดยให้ PR title ขึ้นต้นด้วย `[AI-1][AI1-PERF-001]` หรือ `[AI-2][AI2-CONTENT-001]`; AI-0 จะอ่าน diff และ review comment ก่อนรับงาน. ห้ามใช้ issue/PR เป็นข้ออ้างในการข้าม file reservation หรือข้าม test evidence.

## ข้อห้ามร่วม

ห้าม `reset`, `revert`, force checkout, force push, ลบ recovery ref, ลบหรือ overwrite งานของ owner อื่น, เพิ่ม secret/password/token, ทำ live migration/db push, เปิด future map, เอา preview graph ไปเป็น player control, fabricate quest completion/reward/ability unlock หรืออ้าง authenticated/device/mobile/production acceptance ที่ยังไม่มีหลักฐาน
