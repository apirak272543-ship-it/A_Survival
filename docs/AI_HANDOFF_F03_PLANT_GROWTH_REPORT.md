# F-03 — รายงาน Plant Growth Stage และ Mature-only Reward Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `F-03` ใน repository `apirak272543-ship-it/A_Survival` โดยตรวจลำดับ growth stage `seed → sprout → young → mature`, threshold ตาม elapsed time, mature-only harvest reward, seed/harvest definition links, fictional effect safety และ playable map scope จาก owner จริง. งานนี้เป็น deterministic audit/contract checkpoint ไม่ใช่การอ้างว่าระบบ farm persistence หรือ gameplay transaction ทั้งหมดเสร็จสมบูรณ์

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry หลังตรวจหลักฐานด้วยตนเอง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| `client/src/game/systems/worldFarmSystem.ts` | `getWorldFarmCropStage`, `planPlantWorldSeed`, `planHarvestWorldPlant`, `WorldFarmPlot` และ Obsidian farm plots | Adapter เรียก owner เดิมแบบ read-only และตรวจ threshold ที่ 0%, 25%, 55% และ 100%; harvest ก่อน mature ต้อง reject และเมื่อ mature ต้องสร้าง reward | stage sequence ผิด, growth duration ไม่ถูกต้อง หรือ pre-mature harvest ผ่านจะเป็น `stage-boundary`/`mature-reward` blocker | `server/plantGrowthStageDependencyGraph.test.ts` ผ่าน 6 tests ครอบคลุม boundary และ mature-only behavior |
| `client/src/game/tools/plantCatalogGenerator.ts` | `WORLD_PLANT_CATALOG` 300 รายการ, `seedDefinitionId`, `harvestDefinitionId`, `biomeId`, `soilId`, `growthDurationMs`, effect safety | ตรวจ catalog จริงครบ 300 รายการและ sample stage/reward records แบบ bounded | catalog integrity, seed link, harvest link, effect safety หรือ map scope ผิดจะเป็น required blocker; ไม่สร้าง plant definitions ชุดที่สอง | test จำลอง malformed links, unsafe effect, future biome และ non-positive duration |
| `client/src/game/data/catalog.ts` | seed/harvest item definitions และ harvest reward provenance | mature reward ต้องอ้าง `harvestDefinitionId`, quantity มากกว่า 0 และ provenance type เป็น `harvest`; seed ต้องเป็น category `seed` | item link หายหรือประเภท seed ผิดจะเป็น `seed-link`/`harvest-link` blocker | focused test ตรวจ canonical seed/harvest links และ reward shape |
| `server/generators/dependencyGraph.ts` | dependency node schema และ central validator | ทุก node มี generator/schema/rules/content hash และใช้ `validateGeneratorDependencyGraph` จริง; runtime policy ยังคงปิด | graph invalid เมื่อ audit พบ required blocker; ไม่มีการนำ preview graph ไปเป็น player control | current catalog test graph valid; injected invalid source graph invalid |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/plantGrowthStageDependencyGraph.ts` | เพิ่ม bounded pure graph สำหรับ stage threshold, mature-only reward, seed/harvest links, effect safety และ map scope |
| `server/plantGrowthStageDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ current catalog, exact thresholds, blockers, mature reward, hash sensitivity และ bounds |
| `docs/AI_HANDOFF_F03_PLANT_GROWTH_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `worldFarmSystem.ts` หรือ `plantCatalogGenerator.ts` โดยตรง และไม่มีการแก้ไฟล์ที่ AI-0/AI-1 จองไว้ ได้แก่ quest reward persistence/dispatch, `homeSystemV2.ts`, `syncActionValidation.ts`, `questRewardPendingAction.ts`, `ArcaneFrontier.tsx`, Creator Workbench, creator router, map/cache/offline state, authority/auth, database schema/migration และ runtime render loop. ไม่มีการเขียน IndexedDB/cache/database, ไม่มี live migration, ไม่มี secret/token, ไม่มี graphical asset generation และไม่มี browser/device/mobile acceptance claim

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `F-03` |
| Requirement | seed/sprout/young/mature และ mature-only reward |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/plant-growth-f03` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `04f2cffcda8998934ba7ceb2f11f8b5963d65636` (`origin/main`) |
| Files reserved | `server/generators/plantGrowthStageDependencyGraph.ts`, `server/plantGrowthStageDependencyGraph.test.ts`, `docs/AI_HANDOFF_F03_PLANT_GROWTH_REPORT.md` |
| Implementation commit | `c70d6c22582ccb625e0f63bab665354f74ad4eb6` (`c70d6c2`) |
| Remote branch | `origin/ai-2/plant-growth-f03` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused F-03 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `109` test files / `434` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต plant growth audit

## Result และ blockers/limitations

ผลที่พิสูจน์ได้คือ source `WORLD_PLANT_CATALOG` ปัจจุบันมี 300 plant records ที่ผ่าน catalog validation และ sample audit พบ stage sequence ที่ deterministic ตาม threshold ของ `worldFarmSystem.ts`: เริ่มเป็น `seed`, เปลี่ยนเป็น `sprout` ที่ 25%, `young` ที่ 55% และ `mature` ที่ 100% ของ growth duration. การ harvest ก่อน mature ถูกปฏิเสธ ส่วน mature harvest สร้าง reward จาก canonical `harvestDefinitionId` ด้วย provenance type `harvest`

Checkpoint นี้ยังไม่ทำให้ F-03 ทั้งข้อเป็น `VERIFIED`. ยังไม่มี persistence caller, elapsed-time rehydration acceptance บน storage จริง, authoritative inventory write, gameplay event emission, farm UI/browser acceptance, combat/effect runtime acceptance หรือ mobile/device evidence. Graph runtime policy ยังคงเป็น `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }`

AI-0 ควรตรวจ diff ของ commit `c70d6c2`, ตรวจ completion report นี้ และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากจะทำ persistence หรือ end-to-end farm gameplay ให้เปิด checkpoint และ file reservation ใหม่ ไม่ควรขยาย scope แอบแฝงในไฟล์ owner อื่น
