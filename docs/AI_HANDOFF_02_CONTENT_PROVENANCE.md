> **LEGACY HANDOFF — ไม่ใช่คำสั่ง scope ปัจจุบัน**
> งานเดิมในไฟล์นี้เป็นเพียงบริบท content/provenance. ให้ใช้ [`AI_COMMAND_02_AUTONOMOUS_WORKER_2026-08-27.md`](./AI_COMMAND_02_AUTONOMOUS_WORKER_2026-08-27.md) เป็นคำสั่งปัจจุบัน ซึ่งอนุญาตให้เลือกงานจาก backlog ทั้งหมดและทำต่อเนื่องหลังส่งแต่ละ checkpoint

# AI Handoff 02 — Content Generator และ Asset Provenance

## วิธีใช้ไฟล์นี้

ไฟล์นี้เป็นคำสั่งงานสำหรับ AI ผู้ช่วยคนที่ 2 ให้ทำงานบน Repository `apirak272543-ship-it/A_Survival` แยกจาก AI ตัวหลัก. ก่อนเริ่มต้องอ่าน [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) และลงทะเบียน Task ID/branch/file reservation ตามนั้น. ให้เปิดงานบน **branch หรือ worktree ของตัวเองเท่านั้น** ห้ามแก้ working tree เดียวกับ AI ตัวหลัก. ขอบเขตนี้เน้น content catalog, plant/asset relationship และ provenance; ห้ามแตะ offline map-state, map cache, creator Workbench หรือ authority/auth ที่ถูกจองไว้.

> Repository/Git/test evidence เป็นความจริงสูงสุด. ห้ามเริ่มจากความจำในแชต, ห้าม `reset`, `revert`, `force checkout`, `force push`, ลบ recovery ref หรือจัดการ stash. ก่อนทำให้ตรวจ branch/status/log/diff และเมื่อเสร็จให้ส่ง commit SHA, รายการไฟล์, tests, build และข้อจำกัดกลับมา.

## ความเข้าใจระบบปัจจุบัน

A_Survival เป็นเกม survival/fantasy/technology แบบ voxel-pixel ที่ใช้ Vite + React + TypeScript + Babylon.js, Express/tRPC, Drizzle/MySQL, Dexie/IndexedDB และ Vitest. โลกและ asset ใช้ generator/manifest/registry แบบ deterministic เท่าที่ owner ปัจจุบันรองรับ. หลักใหญ่คือ **Generate Once → Store → Cache → Reuse**: generator สร้าง content ล่วงหน้า, registry ตรวจ provenance/hash, runtime อ่านข้อมูลที่ผ่านการเตรียมแล้ว และไม่ generate texture/model/item/plant/mob ใน render loop.

Creator tools เป็นหลังบ้านภาษาไทยสำหรับ developer/GM/admin/master เท่านั้น. Preview เป็น read-only; ทุก dependency graph ใช้ central validator และ policy `{ runtimeImportAllowed:false, playerVisible:false, cacheable:false }`. ห้ามนำ preview ไปเปิดปุ่มสร้าง content ในหน้า player และห้ามตีความ metadata เป็น binary asset/model/texture ที่พร้อม runtime.

มีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible. Future maps เป็น planned/backend data ได้ แต่ต้องไม่ import, cache, offline-write หรือแสดงให้ player เลือก. งานของไฟล์นี้ต้องไม่แก้ map policy.

ระบบ authority ล่าสุดมี role `user/gm/admin/master`, Master คนแรกกำหนดผ่าน `MASTER_ADMIN_EMAIL` โดย default ที่เจ้าของขอคือ `apirak272543@gmail.com`; ห้ามใส่ password/token/secret ลง repository. GM/Admin ใช้ creator tools ได้ แต่จัดการสมาชิกได้เฉพาะ Master. OAuth account-security เป็น provider-managed; เกมไม่รับหรือเก็บ password และไม่มี provider password/verification API ใน source.

## สถานะ Repository และไฟล์ที่ห้ามชน

สถานะ ณ 2026-08-27 คือ `HEAD == origin/main == 2d0a2206534dba2f34f21c4a166e5883a5f8fc73`. Recovery ref ต้องคงอยู่ที่ `local-recovery-46a4812 -> 46a48125ab0377063cbad77bdd46edb864cc70c2`. AI ตัวหลักกำลังจอง quest reward → inventory dependency slice แบบ **uncommitted** อยู่ จึงห้ามแตะไฟล์ต่อไปนี้และต้องประกาศ reservation ใน registry ก่อนเริ่ม:

| ไฟล์ที่ถูกจองโดย AI ตัวหลัก | เหตุผล |
|---|---|
| `client/src/game/storage/indexedDb.ts` | guard ไม่ให้ future-map state ถูกเขียนลง IndexedDB |
| `client/src/game/storage/mapCache.ts` | map cache policy และ future-map denial |
| `client/src/game/routing/directRoute.ts` | runtime map allow-list/fallback |
| `client/src/game/data/maps.ts` | MAP_REGISTRY source-of-truth |
| `client/src/pages/CreatorDomainWorkbench.tsx` | Workbench เป็น shared integration surface; ห้ามแก้ UI ชนกัน |
| `server/generators/questRewardInventoryDependencyGraph.ts` | AI ตัวหลักกำลังทำ quest reward → inventory dry-run adapter |
| `server/questRewardInventoryDependencyGraph.test.ts` | test ของ reservation ข้างต้น |
| `server/creatorRouter.ts` | `storyOfflineMapStatePreview` admin-only route |
| `server/offlineMapState.test.ts` | future-map offline write regression |
| `server/generators/storyOfflineMapStateDependencyGraph.ts` | story → cache → offline namespace adapter |
| `server/storyOfflineMapStateDependencyGraph.test.ts` | adapter tests |
| `shared/authority.ts` | role/invitation policy ล่าสุดที่ push แล้ว |
| `server/db.ts`, `server/routers.ts` | authority/invitation persistence และ guards |
| `drizzle/schema.ts` และ `drizzle/0010_authority_invitations.sql` | authority invitation schema/migration |
| `client/src/pages/AuthorityAdmin.tsx`, `client/src/pages/AccountSecurity.tsx` | Thai authority/invitation/account security UI |

ห้ามแก้ `docs/OWNER_REQUIREMENTS_MATRIX.md` ใน branch นี้ เพราะ AI ตัวหลักจะบันทึก matrix correction หลัง implementation SHA ของแต่ละ checkpoint. สามารถสร้างรายงาน handoff ของตัวเองได้ แต่ไม่ควรแก้ matrix จนกว่าจะมีการรวมงานและตรวจหลักฐานครบ.

## งานที่มอบหมายให้ AI ตัวที่ 2

ให้เลือกทำ **หนึ่ง checkpoint ที่ปิดได้จริง** ในสาย content generator/asset provenance โดยใช้ owner ที่มีอยู่. ข้อเสนอที่เหมาะสมคือทำ pure audit/relationship adapter ให้ plant catalog, asset provenance, content catalog และ active asset-pack manifest ตรวจสอบความสัมพันธ์กันแบบ deterministic. เป้าหมายไม่ใช่สร้างพืช 300 รูปหรือ generate graphical assets ใหม่ แต่คือแยกให้ชัดว่า item/plant definition ใดมี provenance และ asset binding ที่ตรวจได้ และรายการใดยังเป็น metadata/blocker.

เริ่มจากอ่านไฟล์เหล่านี้:

| Owner | Path |
|---|---|
| Plant catalog | `client/src/game/data/plantCatalog.ts` |
| Plant generator | `client/src/game/tools/plantCatalogGenerator.ts` |
| Plant content graph | `server/generators/plantContentCatalogDependencyGraph.ts` |
| Asset provenance | `client/src/game/data/assetProvenance.ts` |
| Active pack manifest owner | `server/assetPackManifest.test.ts` และ asset pack files ใน `client/public/assets/packs/arcane-frontier-voxel-pixel/` |
| Generic catalog | `server/generators/contentCatalogGenerator.ts`, `server/generators/contentCatalogDependencyGraph.ts` |
| Central validator | `server/generators/dependencyGraph.ts` |
| Existing tests | `server/plantCatalog.test.ts`, `server/plantCatalogGenerator.test.ts`, `server/contentCatalogDependencyGraph.test.ts`, `server/assetPackManifest.test.ts` |
| Matrix requirements | `docs/OWNER_REQUIREMENTS_MATRIX.md` แถว F-01 ถึง F-06, T-03 และ T-04 |

ห้ามเดาว่ารูปภาพหรือ model มีอยู่เพียงเพราะมี metadata. ถ้า plant definition ชี้ไปยัง asset ที่ไม่มีจริง, kind ไม่ตรง, provenance ไม่ชัด หรือไม่มี durable registry ให้สร้าง required blocker/reason code และทดสอบ blocker นั้น. ห้ามแก้ด้วยการลบ reference, fabricating asset, เปลี่ยนสถานะเป็น verified หรือเปิด runtime import.

## ขอบเขตไฟล์ที่แก้ได้

แก้ได้เฉพาะไฟล์ owner และ tests ต่อไปนี้ เว้นแต่มีเหตุจำเป็นจริงและบันทึกเหตุผล:

- `client/src/game/data/plantCatalog.ts`
- `client/src/game/tools/plantCatalogGenerator.ts`
- `client/src/game/data/assetProvenance.ts`
- `server/generators/plantContentCatalogDependencyGraph.ts`
- `server/generators/contentCatalogDependencyGraph.ts`
- `server/generators/contentCatalogGenerator.ts`
- `server/plantCatalog.test.ts`
- `server/plantCatalogGenerator.test.ts`
- `server/contentCatalogDependencyGraph.test.ts`
- `server/contentCatalogGenerator.test.ts`
- `server/assetPackManifest.test.ts`
- เพิ่ม pure adapter/test ใหม่ใน `server/generators/` และ `server/` ได้ ถ้าไม่ชนไฟล์ที่ถูกจอง
- เพิ่มรายงานใหม่ใน `docs/` ได้ แต่ห้ามแก้ matrix โดยตรง

ห้ามแก้ binary/PNG/GLB/ภาพใหม่, `CreatorDomainWorkbench`, `creatorRouter`, map cache/offline state/direct route/map registry, authority/auth, database schema/migration, player UI และ runtime render loop.

## Definition of done

Checkpoint ต้องมี output deterministic และ bounded พร้อม pure tests. ถ้าใช้ dependency graph ต้องต่อผ่าน `validateGeneratorDependencyGraph`, ระบุ `kind/generatorId/generatorVersion/schemaVersion/seed/rulesVersion/contentHash` และ required dependencies ให้ครบ. ห้ามเรียก browser cache, IndexedDB, network fetch, database write หรือ runtime import ใน preview.

ต้องตรวจอย่างน้อยว่า definition/asset/provenance relationship เป็น truth จากไฟล์จริง, missing asset/kind mismatch/unknown provenance เป็น blocker, hash เปลี่ยนเมื่อ input ที่สำคัญเปลี่ยน, และผลลัพธ์ซ้ำได้เมื่อ input เดิม. ห้ามนับจำนวน metadata เป็นจำนวน graphical asset ที่สร้างเสร็จ.

รัน `git diff --check`, `pnpm check` และ focused tests. ถ้าแก้หลาย owner ให้รัน `pnpm test -- --run`; ถ้าเปลี่ยน client/server bundle ให้รัน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build`. ต้องบันทึกจำนวน test files/tests จริงและ known warnings เท่านั้น. ห้ามอ้าง authenticated creator E2E, live database/storage, asset generation, mobile/device acceptance หรือ runtime publish/import/cache หากไม่มีหลักฐานตรง.

## สิ่งที่ห้ามทำโดยเด็ดขาด

ห้ามสร้างหรือนำ asset จาก Minecraft/RoV มาใช้, ห้ามเรียก Google/Gemini/LLM/image generation, ห้ามดาวน์โหลดแล้วรัน artifact ที่ไม่ตรวจ, ห้ามสร้างรูปหรือ model ใหม่นอก authorized scope, ห้ามเติม metadata เพื่อทำให้ graph ผ่าน, ห้ามทำ migration/db push, ห้ามเขียน cache/IndexedDB, ห้ามเปิด future map, ห้ามแก้ role/auth และห้ามทำ UI หลังบ้านชนกับ AI ตัวหลัก.

## รายงานที่ต้องส่งกลับ

รายงานเป็นภาษาไทย โดยมีตาราง `Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence`. ระบุไฟล์ที่แก้, branch, commit SHA, `git status`, test count, build warnings และข้อจำกัด. ต้องอัปเดตสถานะใน [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) ผ่าน branch/PR ของตัวเองหรือส่ง completion report ให้ AI-0 ตรวจ. ระบุชัดว่า implementation ยังไม่ merge เข้า `main`; AI ตัวหลักจะตรวจ diff, ทำ final validation และบันทึก matrix SHA เอง. หากไม่พบ gap ที่ปิดได้จริง ให้ส่งผลสำรวจและ required blockers แทนการสร้างระบบสมมติ.
