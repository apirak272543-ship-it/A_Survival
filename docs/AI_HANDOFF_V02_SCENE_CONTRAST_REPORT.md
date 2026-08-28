# V-02 — รายงาน Scene Material / Visual Contrast Checkpoint

## TASK COMPLETE

ดำเนิน bounded checkpoint สำหรับข้อกำหนด `V-02` ใน repository `apirak272543-ship-it/A_Survival` โดยเพิ่ม pure dependency-graph audit ที่อ่าน source จริงของ scene material/lighting, Obsidian terrain height field, pixel palette, map scene treatment และ biome visual profile. Audit ตรวจว่าทางเดิน terrain ที่ใช้งานจริงเป็น stepped height field ไม่ใช่พื้นราบ, มี side faces จากความต่างระดับ, player/pet/enemy มี palette binding แยกกันและมี contrast กับ terrain อย่างน้อยหนึ่ง family, ค่า emissive/fog/lighting อยู่ในขอบเขตที่กำหนดจาก source และ glow ไม่แทนที่ base color

> งานนี้เป็น **source-level audit/evidence checkpoint** ไม่ใช่การแก้ renderer/material/lighting และไม่ใช่ screenshot หรือ browser acceptance. PR ยังไม่ merge เข้า `main`; AI-0 เป็นเจ้าของ final review, merge, registry และ matrix

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| terrain renderer | caller ของ terrain และ relief geometry | `scene.ts` ใช้ `createPixelTerrainChunks`; chunk geometry อ่าน `sampleObsidianTerrainHeight` และสร้าง side faces เมื่อระดับข้างเคียงต่ำกว่า; bounded sample radius 32 ให้ 4,225 samples, มีความสูงหลายระดับและ positive relief steps | ไม่มี blocker สำหรับ source-level relief; visual appearance จริงยังต้องตรวจบน runtime | focused V-02 ผ่าน `1` file / `5` tests; full suite ผ่าน |
| scene material owner | terrain/actor/block/farm material behavior | terrain texture emissive source `0.025/0.03/0.035`, actor texture emissive `0.08/0.08/0.08`, scene block material glow `0.08`, farm material glow `0.05`; base diffuse/texture color ยังคงถูกสร้างแยกจาก emissive | **`visual-runtime-screenshot-owner-missing`**: ยังไม่มี screenshot owner/evidence ใน checkpoint นี้ | material/lighting assertions ผ่าน; ไม่มี runtime scene mutation |
| actor readability | player/pet/enemy palette และ asset binding | player=`violet`/`voxel/survivor-v1`, pet=`cyan`/`voxel/cyber-fox-v1`, enemy=`crimson`/`voxel/corrupted-husk-v1`; palette binding แตกต่างกัน 3 ค่า และแต่ละ role อ่านได้กับ terrain อย่างน้อยหนึ่ง familyตาม contrast calculation | ไม่อ้างว่าทุกกล้อง ทุกระยะ หรือทุก background ผ่านการมองเห็นจริง | palette/contrast assertions ผ่าน |
| map visual profile | terrain families, landmarks และ emissive declarations | playable `obsidian-frontier` มี terrain families `terrain.ash` และ `terrain.obsidian`, landmark 2 รายการ และ emissive `0.16`, `0.18`; maximum declared decoration emissive `0.18` ต่ำกว่า audit cap `0.25` | reference-only metadata ไม่พิสูจน์ binary asset bytes หรือ final visual quality | profile/emissive assertions ผ่าน |
| lighting/fog owner | sky light, key light, fog input และ applied value | source treatment ของ Obsidian มี fog input `0.07`, scene ใช้ scale `0.11` และ key-light path; audit ยืนยัน glow ไม่ replace base color | **`camera-mode-contrast-acceptance-missing`**: ไม่มี proof ครบ overhead/side/first-person | lighting/fog/base-color assertions ผ่าน |
| map boundary | playable-map guard | adapter รับเฉพาะ `obsidian-frontier`; future/other map และ invalid rules/sample radius ถูก reject fail-closed | ไม่เปิด future map, ไม่เพิ่ม selector/cache/offline path | deterministic/input-bound tests ผ่าน |
| audit/runtime boundary | dependency graph policy และ side effects | graph เป็น pure/read-only; `runtimeImportAllowed:false`, `playerVisible:false`, `cacheable:false`, `binaryAssetsCreated:false`, `runtimeSceneMutated:false` | กราฟจงใจ invalid เพราะ required visual acceptance owners ยัง missing | graph มี `MISSING_REQUIRED_DEPENDENCY` 2 รายการ; `git diff --check`/check/test/build ผ่าน |

## สิ่งที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/sceneMaterialContrastDependencyGraph.ts` | เพิ่ม deterministic bounded graph สำหรับ terrain relief, palette contrast, emissive/fog/lighting, map visual profile และ missing screenshot/camera acceptance owners |
| `server/sceneMaterialContrastDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ relief, actor readability, glow/base-color bounds, required blockers, map guard, determinism และ sample-radius limits |
| `docs/AI_HANDOFF_V02_SCENE_CONTRAST_REPORT.md` | รายงานภาษาไทยฉบับนี้; ไม่แก้ registry หรือ owner matrix |

ไม่ได้แก้ `client/src/game/scene.ts`, `client/src/game/assets/pixelPack.ts`, `client/src/game/systems/terrainHeight.ts`, `client/src/game/data/mapSceneTreatments.ts`, `client/src/game/data/biomeProfiles.ts`, `client/src/index.css`, player controls, Workbench/router, asset loader, binary PNG/GLB/texture/model, persistence owner หรือ map policy. ไม่มี future-map enablement, cache/offline/network/DB write, migration/db push, secret/token หรือ browser/device/visual acceptance claim

## Branch, claim และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `V-02` |
| Requirement | ไม่ใช้พื้นแบนหรือ glow กลืน player/pet/enemy |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/scene-contrast-v02` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Exact reservations | `server/generators/sceneMaterialContrastDependencyGraph.ts`, `server/sceneMaterialContrastDependencyGraph.test.ts`, `docs/AI_HANDOFF_V02_SCENE_CONTRAST_REPORT.md` |
| Implementation commit | `9d51f2fc791e9d89a74fbab43a355e1c24bea7fd` (`9d51f2f`) |
| Registry/matrix | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` หรือ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น final owner |
| Branch safety | fresh branch จาก `origin/main`; ไม่ใช้ reset/revert/force checkout/force push และไม่ลบ recovery ref |

## Validation evidence ที่รันจริง

| Check | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน TypeScript `tsc --noEmit` |
| Focused | `pnpm exec vitest run server/sceneMaterialContrastDependencyGraph.test.ts` ผ่าน `1` file / `5` tests |
| Full | `pnpm test -- --run` ผ่าน `121` files / `505` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่านทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน V-02 ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนดใน `index.html`, analytics script `/umami` ไม่มี `type="module"`, Babylon vendor chunk มีขนาด `3,553.16 kB` และเกิน 1 MB หลัง minification, และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. Warning เหล่านี้อยู่นอก exact V-02 scope

## Result, blocker และ limitations

สิ่งที่พิสูจน์ได้จาก source คือ active renderer ใช้ stepped terrain height field พร้อม side faces, terrain มีความต่างระดับใน bounded sample, actor roles มี palette/asset bindings แยกกัน, declared emissive ของ landmark/block/farm/texture อยู่ใน bounds ที่ audit กำหนด, fog/light values ถูกอ่านและ normalize ตาม scene path และ base color ยังคงอยู่แม้มี emissive

Checkpoint นี้ยังไม่ปิด V-02 ทั้งข้อเป็น `VERIFIED` เพราะยังไม่มี runtime screenshot/visual review ครบทุก camera mode และยังไม่มีหลักฐานทุกตำแหน่ง/ทุกระยะ/ทุกสภาพแสงว่า player, pet และ enemy ไม่ถูก glow หรือ fog กลืน. Contrast calculation เป็น source-level color comparison ไม่ใช่ human visual judgment, GPU/device benchmark หรือ authenticated browser/device acceptance. AI-1 PR #36 เป็น V-01 scene-readability audit คนละ exact paths และไม่ได้ถูกแก้ใน checkpoint นี้

AI-0 ควรตรวจ implementation SHA `9d51f2fc791e9d89a74fbab43a355e1c24bea7fd`, report และ PR diff ก่อน merge. หากจะเติม screenshot/runtime acceptance ให้เปิด reservation ใหม่แบบ exact path และคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้

## Internal source references

[1]: ../client/src/game/scene.ts "Canonical scene material, lighting, and active terrain renderer"
[2]: ../client/src/game/assets/pixelPack.ts "Canonical pixel palette, terrain/actor material, and chunk geometry helpers"
[3]: ../client/src/game/systems/terrainHeight.ts "Canonical Obsidian stepped terrain height sampler"
[4]: ../client/src/game/data/mapSceneTreatments.ts "Canonical map lighting, fog, and terrain treatment data"
[5]: ../client/src/game/data/biomeProfiles.ts "Canonical Obsidian terrain families and landmark emissive declarations"
