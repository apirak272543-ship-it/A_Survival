# F-02 — รายงาน Farm Soil / Block / Biome / Growth / Harvest Checkpoint

## TASK COMPLETE

ดำเนินงาน bounded checkpoint สำหรับข้อกำหนด `F-02` ใน repository `apirak272543-ship-it/A_Survival` โดยเพิ่ม pure dependency-graph audit ที่อ่าน source จริงจาก `client/src/game/tools/plantCatalogGenerator.ts`, `client/src/game/systems/worldFarmSystem.ts` และ canonical catalog/block-action helpers. Audit ตรวจจำนวนและลิงก์ของ plant/seed/harvest, biome/soil compatibility, แปลงปลูก Obsidian, occupied/map guards, offline stage progression, mature-only harvest, inventory consumption boundary และ malformed-state normalization

> งานนี้เป็น **read-only audit/evidence checkpoint** ไม่ใช่การแก้ `worldFarmSystem.ts`, ไม่ใช่การเพิ่ม gameplay caller/persistence และไม่ใช่การประกาศว่า F-02 ทั้งข้อเป็น `VERIFIED`. PR ยังไม่ merge เข้า `main`; AI-0 เป็นเจ้าของ final review, merge, registry และ matrix

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| plant catalog | catalog count, biome, soil, seed/harvest links, growth duration | catalog canonical มี `300` รายการ, biome เดียวคือ `obsidian-frontier`, soil source ครบ 5 ค่า และ validation ไม่พบ issue; seed links, harvest links และ growth durations ผ่าน | catalog เป็น data source ไม่ใช่ universal farm world distribution | focused F-02 ผ่าน `1` file / `5` tests; full suite ผ่าน |
| world farm plots | map-local plot IDs, coordinates, soil boundary | มี 4 plot: `farm-plot-01` ถึง `farm-plot-04`, พิกัด `3:0:1`, `4:0:1`, `3:0:2`, `4:0:2`; ทั้งหมดอยู่ playable Obsidian และใช้ `terra-loam`/`ashen-volcanic` | **`farm-world-distribution-owner-missing`**: ยังไม่มี owner ที่พิสูจน์ distribution ของทั้ง catalog ไปยัง world instances/biomes อย่างครบถ้วน | plot/soil/map assertions ผ่าน; canonical `worldFarmSystem.test.ts` และ `worldFarming.test.ts` รวมอยู่ใน full suite |
| placement policy | seed→plant→soil, occupied, future-map และ action payload | default legacy alias `seed-001` resolve เป็น `plant-001`; plot soil ที่เข้ากันปลูกได้, plot ที่ soil ไม่ตรงถูกปฏิเสธ, occupied plot ถูกปฏิเสธ และ `future-map` ถูกปฏิเสธ | **`farm-block-surface-owner-missing`**: `WorldFarmPlot` มี coordinate/soil แต่ไม่มี canonical block-surface/support owner ใน checkpoint นี้ | placement preview ตรวจ accepted/rejected paths และ action `plant-world-seed`; ไม่มี write |
| growth policy | elapsed-time stage progression | source ให้ stages `empty`, `seed`, `sprout`, `young`, `mature`; preview ที่ 0%, 30%, 70% และ 100% ของ `growthDurationMs` ให้ stage ครบตามลำดับ; duration เป็น positive bounded integer | ยังไม่ใช่ browser/offline rehydration/device timing acceptance | focused stage test ผ่าน และ canonical growth test รวมใน full suite |
| inventory placement boundary | consume seed only after accepted plan | inventory-backed planting ยอมรับ seed และลด quantity จาก 1 stack เหลือ 0; placement ที่ผิด soil ไม่ consume และคง inventory เดิม | authoritative persistence/sync caller ไม่ได้ถูกเพิ่ม | inventory preview ระบุ `writesPerformed:false`; full tests ผ่าน |
| harvest policy | maturity gate, reward, clear plot | harvest ก่อน mature ถูกปฏิเสธ; mature harvest ยอมรับ, คืน `material-002` สำหรับ `plant-001`, สร้าง `harvest-world-crop` action และ clear plant จาก plot | reward grant persistence/event integration ยังเป็น owner แยก; ไม่มี claim ว่าแจก reward ผ่าน network จริง | focused harvest test และ canonical `worldFarmSystem.test.ts` ผ่าน |
| state normalization | malformed plant/foreign plot | normalize เหลือเฉพาะ 4 canonical plots; unknown plant ถูกลบและ foreign plot ถูกตัดออก | ไม่ใช่ IndexedDB reload/multi-map persistence proof | normalization preview ผ่านและไม่มี mutation write |
| runtime/persistence boundary | graph policy and side effects | adapter pure/read-only; `runtimeImportAllowed:false`, `playerVisible:false`, `cacheable:false`; placement, inventory, harvest และ normalization previews ระบุ `writesPerformed:false` | **`farm-persistence-caller-owner-missing`**: ยังไม่มี universal persistence caller/integration evidence สำหรับ F-02 ใน scope นี้ | `git diff --check`, `pnpm check`, focused/full/build ผ่าน |

## สิ่งที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/worldFarmPlacementGrowthDependencyGraph.ts` | เพิ่ม deterministic bounded graph ที่เชื่อม canonical plant catalog, farm plot state, placement, growth และ harvest helpers พร้อม required missing dependencies แบบ fail-closed |
| `server/worldFarmPlacementGrowthDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ catalog/plots, soil/map/occupancy gates, inventory safety, growth stages, mature harvest, normalization, determinism และ input guards |
| `docs/AI_HANDOFF_F02_FARM_PLACEMENT_REPORT.md` | รายงานภาษาไทยฉบับนี้; ไม่แก้ registry หรือ owner matrix |

ไม่ได้แก้ `client/src/game/systems/worldFarmSystem.ts`, `client/src/game/systems/worldFarmingSystem.ts`, `client/src/game/tools/plantCatalogGenerator.ts`, `client/src/game/data/catalog.ts`, Workbench/router, map selector/direct route, persistence owner, binary assets หรือ PR ของ AI-1. ไม่มี future-map enablement, cache/offline write, network/DB write, migration/db push, secret/token หรือ medical claim

## Branch, claim และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `F-02` |
| Requirement | plant soil/block/biome planting/growth/harvest |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/farm-placement-f02` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA | `167a183f68823ed61fb3f3f1a8e8a6f86e3fd036` |
| Exact reservations | `server/generators/worldFarmPlacementGrowthDependencyGraph.ts`, `server/worldFarmPlacementGrowthDependencyGraph.test.ts`, `docs/AI_HANDOFF_F02_FARM_PLACEMENT_REPORT.md` |
| Implementation commit | `36160145a8476fffe05042fcd1d5478162b9ea70` (`3616014`) |
| Registry/matrix | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` หรือ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น final owner |
| Branch safety | fresh branch จาก `origin/main`; ไม่ใช้ reset/revert/force checkout/force push และไม่ลบ recovery ref |

## Validation evidence ที่รันจริง

| Check | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน TypeScript `tsc --noEmit` |
| Focused | `pnpm exec vitest run server/worldFarmPlacementGrowthDependencyGraph.test.ts` ผ่าน `1` file / `5` tests |
| Full | `pnpm test -- --run` ผ่าน `120` files / `500` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่านทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน F-02 ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาด `3,553.16 kB` และเกิน 1 MB หลัง minification, และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. Warning เหล่านี้อยู่นอก exact F-02 scope

## Result, blocker และ limitations

สิ่งที่พิสูจน์ได้คือ canonical catalog มี 300 plant records ที่ลิงก์ seed/harvest/growth ได้, farm state มี 4 map-local plots ใน Obsidian, planting เคารพ map/soil/occupancy/seed rules, growth ขยับครบ 4 non-empty stages ตาม elapsed time, harvest จำกัดเฉพาะ mature และ inventory consumption เกิดหลัง placement ที่ยอมรับเท่านั้น. กราฟจงใจ invalid/fail-closed เพราะ required owners ที่ยังขาดคือ block-surface integration, world-wide distribution และ persistence caller

Checkpoint นี้ยังไม่ปิด F-02 ทั้งข้อเป็น `VERIFIED` เพราะยังไม่มีหลักฐาน universal block-surface/soil distribution ทุก world instance, persistence/reload/multi-map sync, authoritative reward event integration, browser/device acceptance หรือ global matrix completion. F-03/F-04/F-05/F-06 เป็น checkpoint แยกและไม่ได้ถูกแก้หรืออ้างรวมเป็น implementation เดียว

AI-0 ควรตรวจ implementation SHA `36160145a8476fffe05042fcd1d5478162b9ea70`, report และ PR diff ก่อน merge. หากจะเติม runtime caller หรือ persistence ให้เปิด reservation ใหม่แบบ exact path และคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
