# NEXT-ASSET-PROVENANCE-001 — รายงาน Asset Provenance Binding

## TASK COMPLETE

ดำเนินงาน checkpoint `NEXT-ASSET-PROVENANCE-001` บน repository `apirak272543-ship-it/A_Survival` โดย self-claim หลังตรวจ `docs/AI_COORDINATION_REGISTRY.md` พบว่างานยังเป็น `AVAILABLE` และไม่มีการจองไฟล์ที่ชนกัน. Implementation เป็น pure deterministic adapter ที่เชื่อม plant/item definitions กับ active Arcane Frontier manifest และตรวจ file-backed truth, SHA-256, runtime kind, provenance และ durable registry โดยไม่สร้าง graphical assets ใหม่และไม่เปิด runtime import/cache

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจรับ, merge และอัปเดตสถานะ registry หลังตรวจ branch, diff, SHA และผล validation ด้วยตนเอง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| `client/src/game/data/plantCatalog.ts` | Plant catalog 300 รายการ, `assetId`, `seedItemId`, `yieldItemId` และ sample bindings | Adapter ตรวจ plant sample แบบ bounded และไม่สร้าง catalog owner ใหม่; plant asset refs ปัจจุบัน resolve ไปยัง `items.seed` หรือ `art.obsidian.crystal-fern` ตาม definition | `seed-plant-*` และ yield IDs บางรายการไม่มี exact active-pack manifest entry จึงเกิด `plant-binding` required blocker; metadata ไม่ถูกนับเป็น binary asset | `assetProvenanceBindingDependencyGraph.test.ts` ตรวจ missing plant binding และ deterministic sample |
| `client/src/game/data/catalog.ts` | `ALL_ITEMS` 3,910 รายการ, icon asset bindings และ item definition truth | Adapter ตรวจ item sample แบบ bounded, ใช้ `iconAssetId` จาก owner เดิม และพบ file-backed icon bindings ที่ active manifest รองรับจริง เช่น `items.seed` และ `items.buildingCube` | item ที่ไม่มี `iconAssetId` หรือ icon ID ไม่มี exact manifest entry จะเกิด `item-binding` blocker; ไม่มีการเติม icon reference เพื่อบังคับให้ผ่าน | test ตรวจ verified/missing item binding และ sample bound |
| `client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json` | Active pack 39 entries, entry kind, path และ pack SHA | อ่าน manifest เป็น source of truth; ตรวจทุก entry ที่อยู่ใน active pack และใช้ ordered manifest digest + local file SHA-256 | manifest entry ที่หาย, file ที่ไม่ใช่ regular file, SHA mismatch หรือ kind ไม่ใช่ `texture` สำหรับ plant/item binding จะถูก block; test จำลอง kind/hash mismatch | test ตรวจ `packIntegrityVerified`, missing `asset:*`, `asset-integrity:*` และ `DEPENDENCY_KIND_MISMATCH` |
| `client/src/game/data/assetProvenance.ts` | Pack credit และ direct asset credits | ใช้ `getAssetCredit()` จาก canonical owner; active pack มี project-original pack credit จึงใช้ pack-level provenance fallback อย่างโปร่งใส | ยังไม่มี direct per-entry credit และไม่มี durable registry snapshot จึงไม่รายงาน asset ID เป็น verified สุดท้าย | test ตรวจ unknown pack provenance, direct credit path และ durable-registry blocker |
| `server/generators/dependencyGraph.ts` | Dependency node schema, required dependencies และ central validator | ทุก node ระบุ `kind`, `generatorId`, `generatorVersion`, `schemaVersion`, `seed`, `rulesVersion`, `contentHash`; graph runtime policy ยังคงปิด | graph invalid เมื่อ binding, kind, hash, provenance หรือ durable registry ไม่ครบ | task suite ผ่าน และใช้ `validateGeneratorDependencyGraph` จริง |
| `server/generators/assetProvenanceBindingDependencyGraph.ts` | Plant/item → manifest/provenance relationship | เพิ่ม `buildAssetProvenanceBindingDependencyGraph` และ source-injection variant; output deterministic/bounded พร้อม summary ของ verified/blocked assets | active source loader คืน `durableRegistry: null`; logical plant seed/yield references ที่ไม่อยู่ใน manifest เป็น blockers ตามหลักฐานจริง | focused task suite `1` file / `7` tests ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/assetProvenanceBindingDependencyGraph.ts` | เพิ่ม pure bounded adapter สำหรับ plant/item bindings, active manifest/file integrity, kind/provenance/durable-registry gates และ central dependency graph |
| `server/assetProvenanceBindingDependencyGraph.test.ts` | เพิ่ม regression tests 7 รายการสำหรับ deterministic output, missing binding, kind mismatch, SHA mismatch, unknown provenance, durable registry, hash sensitivity และ bounds |
| `docs/AI_HANDOFF_NEXT_ASSET_PROVENANCE_REPORT.md` | รายงาน checkpoint ภาษาไทย; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ไฟล์ที่ AI-0 หรือ AI-1 จองไว้ ได้แก่ quest reward persistence/dispatch, `ArcaneFrontier.tsx`, story persistence, event emitters, Creator Workbench, creator router, map/cache/offline state, authority/auth, database schema/migration, player UI และ runtime render loop. ไม่มีการเพิ่ม PNG/GLB, ดาวน์โหลดหรือใช้ asset จาก Minecraft/RoV, เรียก external LLM/image generation, เขียน IndexedDB/cache/database หรือทำ live migration

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `NEXT-ASSET-PROVENANCE-001` |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/asset-provenance-next-asset-provenance-001` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `05b27c1a16e51f741256d7b08d57e5ee579bb9eb` (`origin/main`) |
| Files reserved | `server/generators/assetProvenanceBindingDependencyGraph.ts`, `server/assetProvenanceBindingDependencyGraph.test.ts`, `docs/AI_HANDOFF_NEXT_ASSET_PROVENANCE_REPORT.md` |
| Implementation commit | `44ee3e4c6b415ee148506585b4b65412f45ef0e6` (`44ee3e4`) |
| Remote branch | `origin/ai-2/asset-provenance-next-asset-provenance-001` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused task suite | ผ่าน `1` test file / `7` tests |
| Full test suite | ผ่าน `109` test files / `435` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขตของ adapter นี้

## Result และ blockers/limitations

Adapter ยืนยันได้ว่า active pack `arcane-frontier-voxel-pixel` มี 39 manifest entries และ file-backed hash truth ที่ตรวจซ้ำได้. Plant/item binding ที่ชี้ไปยัง entry เช่น `items.seed` และ `items.buildingCube` ถูกอ่านจาก manifest/file จริงและตรวจ kind `texture` ได้. Plant seed IDs (`seed-plant-*`) และ yield IDs ที่ไม่ได้เป็น manifest asset IDs ยังคงเป็น required blockers ไม่ถูกแก้ด้วยการลบ referenceหรือเติม metadata

Pack-level provenance ปัจจุบันเป็น `project-original` จาก canonical `ASSET_CREDITS` จึงผ่านระดับ credit แต่ยังไม่มี direct per-entry credit และ durable registry snapshot. ด้วยเหตุนี้ `verifiedAssetIds` จะยังว่างจนกว่าจะมี durable registry evidence จริง แม้บาง binding จะมีไฟล์และ hash ตรง. การมี plant catalog 300 รายการหรือ item catalog 3,910 รายการจึงไม่ถูกตีความเป็น graphical assets ที่สร้างเสร็จ

ยังไม่มีการเชื่อม adapter กับ Workbench/router หรือ runtime; ไม่มี authenticated creator E2E, live database/storage, asset generation, runtime publish/import/cache acceptance, browser/device/mobile acceptance หรือ final matrix update. Graph runtime policy ยังคงเป็น `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }`

AI-0 ควรตรวจ diff ของ commit `44ee3e4`, ตรวจ completion report นี้ และเปลี่ยนสถานะ `NEXT-ASSET-PROVENANCE-001` ใน registry เมื่อหลักฐานครบตามเกณฑ์. หากต้องทำให้ asset เป็น verified จริง ต้องเพิ่ม durable registry และ provenance/binary evidence จาก source ที่ได้รับอนุญาต ไม่ควรปิด blocker ด้วยการเดา
