# AI Handoff 02 — รายงาน Content Generator และ Asset Provenance

## สรุป checkpoint

ดำเนินงานบน repository `apirak272543-ship-it/A_Survival` แยกจาก working tree ของ AI ตัวหลัก โดยเลือกปิด checkpoint **deterministic plant/content/active-pack asset provenance audit** ไม่สร้างภาพหรือ model ใหม่ และไม่ยกระดับ metadata ให้กลายเป็น runtime asset โดยไม่มีหลักฐานจากไฟล์จริง

ผลลัพธ์หลักคือ adapter แบบ pure ที่เชื่อม `PLANT_CATALOG`/world-plant adapter, canonical seed definitions, logical `content.catalog` asset references และ active runtime asset-pack manifest เข้ากับ `validateGeneratorDependencyGraph` โดยตรวจ local file existence, SHA-256, entry kind, pack hash และ project provenance credit. เมื่อพบ logical asset ที่ไม่มีไฟล์จริง, file hash ไม่ตรง, kind ไม่ตรง หรือ provenance ไม่ยืนยัน ระบบจะสร้าง required dependency และ reason-coded blocker แทนการลบ reference หรือ fabricating asset

> สถานะของ implementation นี้คือ **ยังไม่ merge เข้า `main`**. Branch ถูก push ขึ้น GitHub เพื่อให้ AI ตัวหลักตรวจ diff และทำ final integration/validation ต่อ

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| `client/src/game/data/plantCatalog.ts` และ `client/src/game/tools/plantCatalogGenerator.ts` | Plant catalog 300 รายการ, world adapter, seed/yield/soil relationship และ deterministic sampling | ใช้ owner เดิมโดยไม่สร้าง catalog ชุดที่สอง; audit อ่าน plant definitions ทั้งหมดและสร้าง graph node เฉพาะ sample ที่ bounded | หาก definition ไม่มี `assetId`, seed definition หรือ harvest definition ที่ resolve ได้ จะเกิด `plant-asset-binding` หรือ `definition-binding` required blocker | `plantCatalog.test.ts`, `plantCatalogGenerator.test.ts`, และ test ใหม่ผ่านร่วมใน focused suite |
| `server/generators/contentCatalogGenerator.ts` และ `contentCatalogDependencyGraph.ts` | Logical `a-survival.content.plant`/`a-survival.content.seed` refs และ category assets | คง abstraction เดิมว่าเป็น logical metadata; audit แยก logical asset node ออกจาก runtime asset node เพื่อไม่ให้ metadata satisfy file-backed dependency โดยบังเอิญ | Active playable pack ไม่มี exact file-backed binding สำหรับ logical IDs ทั้งสองรายการ จึงเกิด `content-asset-binding` จำนวน 2 และ graph ไม่ valid ตามที่ควร | test ใหม่ยืนยัน `runtime-asset:a-survival.content.plant` เป็น missing required dependency |
| `client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json` | Active pack identity, namespace, version, 39 entries, manifest entry kinds, ordered entry digest hash และ local file SHA-256 | ตรวจ pack `arcane-frontier-voxel-pixel`, namespace `af`, version `0.3.0`; `items.seed` และ `art.obsidian.crystal-fern` มี entry แบบ `texture` และไฟล์จริง hash ตรง | รายการที่ manifest ไม่มี, ไฟล์หาย, file SHA-256 ไม่ตรง หรือ kind ไม่ใช่ `texture` จะถูก block; test จำลอง digest mismatch และ kind mismatch | `assetPackManifest.test.ts` เดิมผ่าน; test ใหม่ตรวจ file-integrity และ kind mismatch ผ่าน |
| `client/src/game/data/assetProvenance.ts` | Pack-level provenance credit และ distributable status | active pack resolve ได้ credit `pack.arcane-frontier-voxel-pixel` และเป็น `project-original`; adapter สร้าง provenance node เฉพาะเมื่อ `canDistributeAsset` ผ่าน | ถ้า provenance unknown หรือเป็น reference-only จะเกิด `asset-provenance` required blocker และไม่ถือว่า asset พร้อมแจกจ่าย | test ใหม่จำลอง `provenance: null` และยืนยัน missing provenance dependency |
| `server/generators/dependencyGraph.ts` | Node schema, required dependency, kind/hash compatibility และ runtime policy | ทุก node ระบุ `kind`, `generatorId`, `generatorVersion`, `schemaVersion`, `seed`, `rulesVersion`, `contentHash`; output ใช้ runtime policy `{ runtimeImportAllowed:false, playerVisible:false, cacheable:false }` | Graph ของ checkpoint ยัง invalid อย่างตั้งใจเมื่อ logical/runtime binding หรือ provenance หลักฐานไม่ครบ | test ใหม่ตรวจ required missing dependency และ `DEPENDENCY_KIND_MISMATCH` |
| `server/generators/plantAssetProvenanceDependencyGraph.ts` | Relationship adapter และ bounded pure source injection | เพิ่ม `buildPlantAssetProvenanceDependencyGraph` สำหรับ active repository pack และ `buildPlantAssetProvenanceDependencyGraphFromSources` สำหรับ pure regression tests; audit asset IDs ที่พบจริงคือ `art.obsidian.crystal-fern`, `items.seed` และ logical IDs สองรายการ | ไม่เปิด runtime import, browser cache, IndexedDB, network, database write หรือ asset generation; logical IDs ยังคง blocker | test ใหม่ 6 tests ครอบคลุม deterministic output, local hash mismatch, wrong kind, unknown provenance, hash change และ bounds |

## ไฟล์ที่แก้

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/plantAssetProvenanceDependencyGraph.ts` | เพิ่ม pure deterministic audit adapter, active-pack file/hash reader, provenance gate, runtime/logical asset separation, status summary, unresolved reason codes และ central dependency-graph validation |
| `server/plantAssetProvenanceDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ deterministic output, logical-vs-runtime distinction, file SHA mismatch, kind mismatch, unknown provenance, hash change และ input bounds |
| `docs/AI_HANDOFF_02_CONTENT_ASSET_PROVENANCE_REPORT.md` | รายงาน handoff ฉบับนี้; ไม่แก้ `docs/OWNER_REQUIREMENTS_MATRIX.md` ตามข้อกำหนด |

ไม่มีการแก้ไฟล์ที่ AI ตัวหลักจองไว้ ได้แก่ offline map-state/cache/direct route/map registry, Creator Workbench/creator router, authority/auth, database schema/migration, player UI และ runtime render loop. ไม่มีการเพิ่ม binary/PNG/GLB, ใช้ external asset, เรียก image/LLM generation หรือทำ database/storage write

## Branch และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Repository | `apirak272543-ship-it/A_Survival` |
| Starting source | `origin/main` ที่ตรวจตอนเริ่มงานคือ `4fcb65c` และ working tree ใหม่สะอาด; commit นี้อยู่บนประวัติเดียวกับ `def5d13` |
| Branch | `ai2/content-asset-provenance-audit` |
| Implementation commit | `a5a41053d2edf782fd9c0609cb07a712645f4924` (`a5a4105`) |
| Remote branch | `origin/ai2/content-asset-provenance-audit` |
| Push state | branch local ตรงกับ remote หลัง push และไม่มี uncommitted implementation changes ก่อนเพิ่มรายงานฉบับนี้ |
| Recovery refs / stash | ไม่แตะต้อง ไม่ reset, revert, force checkout, force push, recovery ref หรืองาน stash |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused provenance suite | ผ่าน `1` test file / `6` tests |
| Focused owner suite | ผ่าน `7` test files / `27` tests: provenance adapter, plant catalog, plant generator, plant graph, content catalog, content graph และ active asset-pack manifest |
| Full test suite | ผ่าน `102` test files / `399` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build มี warning ที่ตรวจพบจริงและเป็นข้อจำกัด/สภาพเดิมของ repository: `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดถูกแก้ใน checkpoint นี้เพราะอยู่นอกขอบเขต

## ข้อจำกัดและสิ่งที่ยังไม่อ้างว่าเสร็จ

Checkpoint นี้พิสูจน์ **ความสัมพันธ์เชิง metadata/file provenance ใน repository และ active pack** เท่านั้น ไม่ได้พิสูจน์ว่า plant ทั้ง 300 ชนิดมี graphical asset เฉพาะตัว เพราะ runtime plants จำนวนมากยังชี้ไปยัง asset ID ร่วม และ logical catalog IDs ยังไม่มี exact active-pack files. การมี 300 definitions จึงไม่ถูกนับเป็น 300 graphical assets

ยังไม่มีการเชื่อม adapter นี้เข้ากับ Creator Workbench หรือ `creatorRouter` เพราะไฟล์ดังกล่าวถูกสงวนไว้โดย AI ตัวหลัก. ยังไม่มี authenticated creator E2E, live database/storage, durable registry write, object-storage upload, asset generation, runtime publish/import/cache acceptance, browser/device/mobile acceptance หรือ final matrix update. Graph runtime policy ยังคงปิดการ import, player visibility และ cache ตาม contract

AI ตัวหลักควรตรวจ diff ของ commit `a5a4105`, รัน final validation บน branch integration และตัดสินใจว่าจะเชื่อม pure adapter เข้า orchestrator/creator preview ใน checkpoint ถัดไปหรือไม่ โดยรักษา blocker ของ logical-only, wrong-kind, hash-mismatch และ unknown-provenance ไว้จนกว่าจะมีหลักฐาน asset/registry ที่แท้จริง
