# T-04 — รายงาน Common Generator API / Game Creation Engine Coverage Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `T-04` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph adapter เพื่อตรวจ common generator plugin contracts ที่มีอยู่จริงในหก domain ได้แก่ animation, content, quest, structure, texture และ item. ตรวจ plugin identity, semver, registry registration, generate/validate/preview hooks, deterministic source hash และ runtime publish boundary โดยไม่แก้ shared API หรือ plugin owner files

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| Common Generator API plugin registry | plugin identity/version/registration | ตรวจ plugin 6 ตัวจาก source จริง: `animation.profile`, `content.catalog`, `quest.progression`, `structure.placement`, `texture.pack`, `item.universal`; ทุกตัวมี lowercase id, semver `1.0.0` และ registry version ตรงกัน | duplicate/invalid id, invalid semver, registry mismatch หรือ registry version missing เป็น required blocker | focused T-04 suite ผ่าน 1 file / 6 tests |
| domain coverage | generator kind และ source ownership | kind distribution คือ animation `1`, item `2`, quest `1`, structure `1`, texture `1`; source paths ระบุ owner แยกชัดเจน; ไม่มีการรวม role/application/UI | unsupported kind หรือ source descriptor ผิดเป็น blocker; ไม่มีการแก้ plugin owner | test ยืนยัน 6 domains, 6 unique plugin IDs และ exact source paths |
| generation contract | `generate`, `validate`, `preview` hooks | plugin ทั้ง 6 ตัวมี function hooks ครบ; adapter ตรวจ metadata โดยไม่เรียกสร้าง payload ขนาดใหญ่หรือเขียนไฟล์ runtime | missing hook โดยเฉพาะ preview เป็น blocker เพื่อป้องกันการ publish โดยไม่มี read-only inspection boundary | test ตรวจ typeof hooks และ inject preview-missing variant |
| deterministic artifact boundary | source metadata hash และ bounded sample | source metadata hash เป็น SHA-256 deterministic; caller จำกัด sample count ได้ไม่เกิน 64; graph node sample แยกจาก full source audit | source metadata เปลี่ยนแล้ว hash ต้องเปลี่ยน; invalid seed/sample bounds ถูก reject | test determinism, source hash sensitivity และ partial sample ผ่าน |
| generate-once/cache/publish policy | runtime safety policy ของ generator artifacts | summary ระบุ `generatedOnce: true`, `cacheReuseAllowed: true`, `playerVisible: false`, `runtimeImportAllowed: false`, `runtimePublishAllowed: false`; central graph runtime policy ปิด import/player/cache | adapter ไม่เปิด player route, map/cache/offline write หรือ runtime publish; policy เป็น evidence contract ไม่ใช่การอ้าง deployment | test ยืนยัน summary/runtime policy และ graph policy |
| central dependency graph | required blocker semantics | graph ใช้ `validateGeneratorDependencyGraph`; invalid plugin descriptor สร้าง required missing dependency ทำให้ graph fail-closed | ไม่ลบ blocker หรือ normalize unsafe descriptor ให้ผ่าน | test invalid id/version/registry/kind/preview และ duplicate ID ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/commonGeneratorCoverageDependencyGraph.ts` | เพิ่ม pure T-04 adapter สำหรับตรวจหก plugin domains, registry/version/hook contract, deterministic metadata hash, bounded sample และ fail-closed dependency graph |
| `server/commonGeneratorCoverageDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ canonical coverage, hooks, invalid contracts, duplicates, hash sensitivity และ input bounds |
| `docs/AI_HANDOFF_T04_COMMON_GENERATOR_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `server/generators/commonGeneratorApi.ts` หรือ plugin owner files ได้แก่ `animationProfileGenerator.ts`, `contentCatalogGenerator.ts`, `questProgressionGenerator.ts`, `structureGenerator.ts`, `texturePackBuilder.ts` และ `universalItemEngine.ts` โดยตรง. ไม่มีการแก้ Workbench/router, asset manifest/binary, map allow-list/cache/offline persistence, authority/auth/schema/migration, runtime render loop หรือ player UI. ไม่มีการสร้าง PNG/GLB/texture/model, ไม่มี external generation, ไม่มี secret/token และไม่มีการอ้างว่า generator ทุก domain เชื่อม gameplay/UI หรือ publish ได้จริง

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `T-04` |
| Requirement | Common Generator API / Game Creation Engine all domains |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/common-generator-t04` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `c311b981396bf4db98ed92142a15eae795bb5a68` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/commonGeneratorCoverageDependencyGraph.ts`, `server/commonGeneratorCoverageDependencyGraph.test.ts`, `docs/AI_HANDOFF_T04_COMMON_GENERATOR_REPORT.md` |
| Implementation commit | `52d42da9f523865dc004d706b5a38b4e086dee17` (`52d42da`) |
| Remote branch | `origin/ai-2/common-generator-t04` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean หลัง push; `git diff --check` ผ่านก่อน commit |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused T-04 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `113` test files / `461` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต T-04 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ source ปัจจุบันมีหก common generator plugins ที่ลงทะเบียนผ่าน `CommonGeneratorRegistry` และมี generate/validate/preview hooks ครบ พร้อม deterministic metadata hash และ bounded audit graph. Runtime policy ของ adapter ยังคงปิด player visibility, runtime import, runtime publish และ client cache eligibility ตาม invariant ของ repository

Checkpoint นี้ยังไม่ปิด T-04 ทั้งข้อเป็น `VERIFIED`. ยังไม่ได้ทดสอบ generate/validate/export ของทุก plugin ด้วย payload เต็มใน adapter นี้, ยังไม่มี durable orchestrator ที่รวมทุก domain, ยังไม่มี asset manifest publish workflow, ไม่มี runtime approval UI, ไม่มี browser/device/mobile evidence และไม่มีการประกาศว่า generator artifact ใดถูกนำเข้า player runtime แล้ว. การตรวจนี้จึงเป็น registry/contract coverage evidence เท่านั้น

AI-0 ควรตรวจ diff ของ commit `52d42da`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องเพิ่ม orchestrator, export/publish approval หรือ full per-plugin payload acceptance ให้เปิด checkpoint และ exact reservation ใหม่ โดยไม่ขยายงานนี้ย้อนหลัง
