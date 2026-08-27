# AI Handoff 02 — รายงาน Content Generator และ Asset Provenance

## TASK COMPLETE

ดำเนินงานตาม `AI2-CONTENT-001` บน repository `apirak272543-ship-it/A_Survival` โดยอ่าน `docs/AI_COORDINATION_REGISTRY.md` ก่อนเริ่ม, ประกาศ task claim, ใช้ branch/worktree แยก และสงวนเฉพาะไฟล์ในขอบเขต content/plant/asset provenance. งานนี้เป็น **deterministic pure audit checkpoint** ไม่สร้างภาพหรือ model ใหม่ และไม่ยกระดับ metadata ให้เป็น runtime asset โดยไม่มีหลักฐานจากไฟล์จริง

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจรับและเปลี่ยนสถานะใน registry หลังตรวจ branch, diff, SHA และผล validation ด้วยตนเอง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| `client/src/game/data/plantCatalog.ts` และ `client/src/game/tools/plantCatalogGenerator.ts` | Plant catalog 300 รายการ, world adapter, seed/yield/soil relationship และ deterministic sampling | ใช้ owner เดิมโดยไม่สร้าง catalog ชุดที่สอง; audit อ่าน plant definitions ทั้งหมดและสร้าง graph node เฉพาะ sample ที่ bounded | หาก definition ไม่มี `assetId`, seed definition หรือ harvest definition ที่ resolve ได้ จะเกิด `plant-asset-binding` หรือ `definition-binding` required blocker | `plantCatalog.test.ts`, `plantCatalogGenerator.test.ts` และ test ใหม่ผ่าน |
| `server/generators/contentCatalogGenerator.ts` และ `contentCatalogDependencyGraph.ts` | Logical `a-survival.content.plant`/`a-survival.content.seed` refs และ category assets | คง abstraction เดิมว่าเป็น logical metadata; แยก logical asset node ออกจาก runtime asset node เพื่อไม่ให้ metadata satisfy file-backed dependency โดยบังเอิญ | Active playable pack ไม่มี exact file-backed binding สำหรับ logical IDs ทั้งสองรายการ จึงเกิด `content-asset-binding` จำนวน 2 และ graph ไม่ valid ตามที่ควร | test ใหม่ยืนยัน missing `runtime-asset:a-survival.content.plant` และ seed dependency |
| `client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json` | Active pack identity, namespace, version, manifest kinds, ordered digest hash และ local file SHA-256 | ตรวจ pack `arcane-frontier-voxel-pixel`, namespace `af`, version `0.3.0`; `items.seed` และ `art.obsidian.crystal-fern` มี entry แบบ `texture` และไฟล์จริง hash ตรง | รายการที่ manifest ไม่มี, ไฟล์หาย, file SHA-256 ไม่ตรง หรือ kind ไม่ใช่ `texture` ถูก block | `assetPackManifest.test.ts` เดิมผ่าน; test ใหม่จำลอง digest mismatch และ kind mismatch ผ่าน |
| `client/src/game/data/assetProvenance.ts` | Pack-level provenance credit และ distributable status | active pack resolve ได้ `pack.arcane-frontier-voxel-pixel` เป็น `project-original`; audit สร้าง provenance node เฉพาะเมื่อ `canDistributeAsset` ผ่าน | provenance unknown หรือ reference-only จะเกิด `asset-provenance` required blocker | test ใหม่จำลอง `provenance: null` และยืนยัน missing provenance dependency |
| `server/generators/dependencyGraph.ts` | Node schema, required dependency, kind/hash compatibility และ runtime policy | ทุก node ระบุ `kind`, `generatorId`, `generatorVersion`, `schemaVersion`, `seed`, `rulesVersion`, `contentHash`; runtime policy ปิด import/player/cache | graph คง invalid เมื่อ logical/runtime binding, kind, hash หรือ provenance หลักฐานไม่ครบ | test ใหม่ตรวจ missing required dependency และ `DEPENDENCY_KIND_MISMATCH` |
| `server/generators/plantAssetProvenanceDependencyGraph.ts` | Relationship adapter และ bounded source injection | เพิ่ม `buildPlantAssetProvenanceDependencyGraph` สำหรับ active repository pack และ `buildPlantAssetProvenanceDependencyGraphFromSources` สำหรับ pure regression tests; ตรวจ asset IDs ที่พบจริงและแยก verified asset กับ metadata/blocker | ไม่เปิด browser cache, IndexedDB, network, database write, runtime import หรือ asset generation | test ใหม่ 6 tests ครอบคลุม deterministic output, local hash mismatch, wrong kind, unknown provenance, hash change และ input bounds |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/plantAssetProvenanceDependencyGraph.ts` | เพิ่ม pure deterministic audit adapter, active-pack file/hash reader, provenance gate, logical/runtime asset separation, status summary, unresolved reason codes และ central graph validation |
| `server/plantAssetProvenanceDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ deterministic output, logical-vs-runtime distinction, file SHA mismatch, kind mismatch, unknown provenance, hash change และ input bounds |
| `docs/AI_HANDOFF_02_CONTENT_ASSET_PROVENANCE_REPORT.md` | รายงาน completion นี้; ไม่แก้ `docs/OWNER_REQUIREMENTS_MATRIX.md` หรือ `docs/AI_COORDINATION_REGISTRY.md` เพราะ AI-0 เป็น owner ของทะเบียนกลาง |

ไม่มีการแก้ไฟล์ที่ AI-0 จองไว้ ได้แก่ `server/generators/questRewardInventoryDependencyGraph.ts`, `server/questRewardInventoryDependencyGraph.test.ts`, offline map-state/cache/direct route/map registry, Creator Workbench/creator router, authority/auth, database schema/migration, player UI และ runtime render loop. ไม่มีการเพิ่ม binary/PNG/GLB, ใช้ external asset หรือเรียก Google/Gemini/LLM/image generation

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `AI2-CONTENT-001` |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/content-ai2-content-001` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `d282e8ed7ecbbde83637d892e3edbd2440efd5c8` (`origin/main` หลัง fetch ล่าสุด) |
| Registry reservation | `AI2-CONTENT-001` เป็น `RESERVED`; AI-0 เป็น owner ของ `main` และ registry ตามกติกา |
| Files reserved | `server/generators/plantAssetProvenanceDependencyGraph.ts`, `server/plantAssetProvenanceDependencyGraph.test.ts`, `docs/AI_HANDOFF_02_CONTENT_ASSET_PROVENANCE_REPORT.md` |
| Implementation commit | `caf2fadaf12b1bf255a729ba0a1afbefecd58c2c` (`caf2fad`) |
| Report commit | จะระบุหลัง commit รายงานฉบับสุดท้าย |
| Remote branch | `origin/ai-2/content-ai2-content-001` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ทั้ง `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md` |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

หมายเหตุ: registry และ handoff ระบุ base เก่า `2d0a220`/`08b9d6d` ตามเวลาที่เขียนเอกสาร แต่การตรวจ Git ล่าสุดพบ `origin/main` อยู่ที่ `d282e8e`; รายงานนี้ยึด commit และ status จาก repository จริงเป็นหลัก

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused provenance suite | ผ่าน `1` test file / `6` tests |
| Focused owner suite | ผ่าน `7` test files / `27` tests: provenance adapter, plant catalog, plant generator, plant graph, content catalog, content graph และ active asset-pack manifest |
| Full test suite | ผ่าน `105` test files / `412` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build มี warning ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้: `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขตของ checkpoint นี้

## Result และ blockers/limitations

ผล audit ที่ยืนยันจาก active pack คือ `items.seed` และ `art.obsidian.crystal-fern` มี manifest entry แบบ `texture`, ไฟล์จริง และ SHA-256 ตรง รวมทั้งมี pack-level project provenance. ส่วน `a-survival.content.plant` และ `a-survival.content.seed` ยังเป็น logical-only จึงถูกคงไว้เป็น blocker ไม่ถูกนับเป็น graphical assets ที่สร้างเสร็จ. การมี plant definitions 300 รายการจึงไม่ถูกตีความเป็น graphical assets 300 รายการ

ยังไม่มีการเชื่อม adapter เข้ากับ Creator Workbench หรือ `creatorRouter` เพราะเป็น shared integration surface ที่ถูกสงวนไว้. ยังไม่มี authenticated creator E2E, live database/storage, durable registry write, object-storage upload, asset generation, runtime publish/import/cache acceptance, browser/device/mobile acceptance หรือ final matrix update. Graph runtime policy ยังคงเป็น `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }`

AI-0 ควรตรวจ diff ของ commit `caf2fad`, ตรวจ completion report นี้ และเปลี่ยนสถานะ registry จาก `RESERVED` เมื่อหลักฐานครบตามเกณฑ์ของ AI-0. หากต้องเปิด logical asset blocker ในอนาคต ต้องเพิ่ม file-backed manifest/registry/provenance หลักฐานจริง ไม่ควรแก้ด้วยการเติม metadata หรือเปลี่ยนสถานะเป็น verified
