# AI Handoff 01 — Runtime Performance และ Visibility

## วิธีใช้ไฟล์นี้

ไฟล์นี้เป็นคำสั่งงานสำหรับ AI ผู้ช่วยคนที่ 1 ให้ทำงานบน Repository `apirak272543-ship-it/A_Survival` แยกจาก AI ตัวหลัก. ก่อนเริ่มต้องอ่าน [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) และลงทะเบียน Task ID/branch/file reservation ตามนั้น. ให้เปิดงานบน **branch หรือ worktree ของตัวเองเท่านั้น** ห้ามแก้ working tree เดียวกับ AI ตัวหลัก และห้ามแก้ไฟล์ที่อยู่นอกขอบเขตที่ระบุ. เมื่อทำเสร็จให้ส่ง commit SHA, รายการไฟล์, ผล `pnpm check`, focused tests, full tests/build และข้อจำกัดกลับมา.

> ห้ามใช้ความจำจากแชตแทน Repository. ให้ตรวจ `git status`, `git log`, diff และ source owner ก่อนทุกครั้ง. ห้าม `reset`, `revert`, `force checkout`, `force push`, ลบ branch/recovery ref หรือจัดการ stash.

## ภาพรวมเกมและสถาปัตยกรรมที่ต้องเข้าใจ

A_Survival เป็นเกม survival/fantasy/technology แบบ voxel-pixel มุมมอง top-down/isometric บน Vite + React 19 + TypeScript + Babylon.js โดยมี Express/tRPC, Drizzle/MySQL, Dexie/IndexedDB และ Vitest. ระบบ generator เป็นเครื่องมือฝั่ง developer; player runtime ต้องใช้ข้อมูลที่สร้างไว้แล้วผ่าน registry/cache และไม่ควร generate หรือคำนวณสิ่งเดิมซ้ำใน render loop.

หลัก performance กลางคือ **Generate Once → Store → Cache → Reuse**. Runtime ควรทำเพียง input, game state, necessary simulation, visible objects และ rendering. ห้าม generate world/texture/model/animation/item/plant/mob ใหม่ทุก frame, ห้าม load asset ซ้ำ, ห้าม render นอกระยะ และควรลด simulation/animation/physics/chunk/shadow/effect quality ตาม profile เมื่อเหมาะสม.

มีเพียง `obsidian-frontier` ที่เป็น playable/selectable/cache-eligible runtime map. แผนที่อนาคตเป็น planned/backend data ได้ แต่ direct route, runtime import, player visibility, cache preparation และ offline state write ต้องไม่เปิดให้แผนที่อนาคต. ทุก dependency graph เป็น read-only preview และคืน policy คงที่ `{ runtimeImportAllowed:false, playerVisible:false, cacheable:false }`.

Creator tools เป็นภาษาไทย, developer/admin/GM/master-only, no-code และอยู่แยกจาก player landing/HUD/game. ห้ามเพิ่มปุ่ม profiler หรือ generator ให้ผู้เล่น. ห้ามอ้าง device FPS, GPU, memory, offline หรือ mobile acceptance หากยังไม่มีหลักฐานอุปกรณ์จริง.

## สถานะ Repository ที่ต้องยึด

สถานะ ณ 2026-08-27 คือ `HEAD == origin/main == 2d0a2206534dba2f34f21c4a166e5883a5f8fc73` โดยมี recovery ref `local-recovery-46a4812 -> 46a48125ab0377063cbad77bdd46edb864cc70c2`. AI ตัวหลักกำลังจอง quest reward → inventory dependency slice แบบ **uncommitted** อยู่ ดังนั้นต้องห้ามแตะไฟล์ที่ระบุด้านล่างและต้องประกาศ reservation ใน registry ก่อนเริ่ม:

| ไฟล์ที่ถูกจองโดย AI ตัวหลัก | เหตุผล |
|---|---|
| `client/src/game/storage/indexedDb.ts` | เพิ่ม fail-closed guard ไม่ให้เขียน offline state ของ future map |
| `server/creatorRouter.ts` | กำลังเพิ่ม `storyOfflineMapStatePreview` admin-only route |
| `server/offlineMapState.test.ts` | regression ของ future-map write denial |
| `server/generators/storyOfflineMapStateDependencyGraph.ts` | adapter story → cache → offline namespace |
| `server/storyOfflineMapStateDependencyGraph.test.ts` | pure graph tests ของ slice ข้างต้น |
| `client/src/game/storage/mapCache.ts` | owner ของ map cache policy ที่ปิด future map แล้ว |
| `client/src/game/routing/directRoute.ts` | owner ของ runtime map allow-list; ห้ามสร้าง guard ซ้ำ |
| `client/src/game/data/maps.ts` | registry map owner; ห้ามแก้เพื่อเปิด future map |
| `client/src/pages/CreatorDomainWorkbench.tsx` | Workbench เป็น shared integration surface; ห้ามแก้ UI ชนกัน |
| `server/generators/questRewardInventoryDependencyGraph.ts` | AI ตัวหลักกำลังทำ quest reward → inventory dry-run adapter |
| `server/questRewardInventoryDependencyGraph.test.ts` | test ของ reservation ข้างต้น |

อย่าแก้ `shared/authority.ts`, `server/routers.ts`, `server/db.ts`, `drizzle/schema.ts` หรือ migration authority เพราะเป็น checkpoint authority/invitation ล่าสุดที่ push แล้ว. Master email ของเจ้าของคือ `apirak272543@gmail.com` และกำหนดผ่าน `MASTER_ADMIN_EMAIL`; ห้ามใส่ password, token หรือ secret ลง code.

## งานที่มอบหมายให้ AI ตัวที่ 1

ให้เชื่อม **performance profile → runtime visibility/telemetry/profiler** ผ่าน owner จริงแบบ data-driven และ pure/read-only. เป้าหมายไม่ใช่ benchmark ใหม่ แต่คือทำให้ contract ของ budget, visible object count, throttled/sleep policy และ profiler snapshot ตรวจสอบความเข้ากันได้ได้ชัดขึ้นโดยไม่คำนวณ asset หรือเรียก generator ใน render loop.

เริ่มจากอ่านไฟล์เหล่านี้ก่อน:

| Owner | Path |
|---|---|
| Performance profile | `client/src/game/systems/performanceProfile.ts` |
| Runtime telemetry | `client/src/game/systems/runtimePerformanceTelemetry.ts` |
| Visibility policy | `client/src/game/systems/runtimeVisibilitySystem.ts` |
| Profiler adapter | `server/generators/runtimePerformanceProfiler.ts` |
| Existing tests | `server/performanceProfile.test.ts`, `server/runtimePerformanceTelemetry.test.ts`, `server/runtimeVisibilitySystem.test.ts`, `server/runtimePerformanceProfiler.test.ts` |
| Matrix source of truth | `docs/OWNER_REQUIREMENTS_MATRIX.md` แถว T-01, S-03, S-04 |

ให้ตรวจว่า owner ปัจจุบันมี input/output อะไรจริง แล้วเลือก **งานเดียวที่ปิดได้เป็น checkpoint** เช่น pure contract adapter หรือ invariant validator ที่ยืนยันว่า profile เดียวกันถูกใช้โดย visibility และ profiler. หากพบว่า culling/LOD/pooling/occlusion ยังไม่มี owner จริง ห้ามสร้างระบบปลอมขนาดใหญ่; ให้คืน required blocker หรือบันทึกข้อจำกัดแทน.

## ขอบเขตไฟล์ที่แก้ได้

แก้ได้เฉพาะ owner และ test ในรายการนี้ เว้นแต่จำเป็นจริงและอธิบายในรายงาน:

- `client/src/game/systems/performanceProfile.ts`
- `client/src/game/systems/runtimePerformanceTelemetry.ts`
- `client/src/game/systems/runtimeVisibilitySystem.ts`
- `server/generators/runtimePerformanceProfiler.ts`
- `server/performanceProfile.test.ts`
- `server/runtimePerformanceTelemetry.test.ts`
- `server/runtimeVisibilitySystem.test.ts`
- `server/runtimePerformanceProfiler.test.ts`
- เพิ่ม pure adapter/test ใหม่ใน `server/generators/` และ `server/` ได้ ถ้าไม่แตะไฟล์ที่ถูกจอง

ห้ามแก้ player UI, `CreatorDomainWorkbench`, route authorization, database schema/migration, asset bytes, map registry, map cache, offline IndexedDB และ dependency graph slice ของ AI ตัวหลัก.

## Definition of done

งานจะถือว่าปิดเป็น checkpoint ได้ก็ต่อเมื่อ output deterministic, bounded และมี tests ยืนยัน policy. ต้องระบุชัดว่ามีหรือไม่มี runtime write, generator call, asset generation, cache write, player-visible effect และ device benchmark. ต้องรันอย่างน้อย `git diff --check`, `pnpm check`, focused tests ของ owner และถ้ามีการแก้หลายไฟล์ให้รัน `pnpm test -- --run`. Production build ให้รันเมื่อ client/server bundle ถูกเปลี่ยน.

หากต้องเพิ่ม dependency graph ให้ใช้ central validator `server/generators/dependencyGraph.ts`, required blockers, kind/generator/version/hash compatibility และ fixed runtime denial. ห้าม mark graph valid ด้วยการละเว้น dependency; missing LOD/asset/registry/device evidence ต้องแสดงเป็น blocker.

## สิ่งที่ห้ามทำโดยเด็ดขาด

ห้ามทำ device benchmark แล้วอ้างว่า mobile performance ผ่าน, ห้ามแก้ runtime ให้ generate asset ทุก frame, ห้ามเพิ่ม cache/localStorage/IndexedDB write ที่ทำให้ future map เปิด, ห้ามสร้าง asset รูปภาพใหม่, ห้ามใช้ Minecraft/RoV code หรือ asset, ห้ามเรียก LLM/image generation, ห้ามรัน live migration/db push, ห้ามแก้ role/auth, ห้ามแก้ไฟล์ที่ถูกจอง และห้าม push ทับ `main` หรือใช้ force push.

## รายงานที่ต้องส่งกลับ

ส่งเป็นภาษาไทยพร้อม commit SHA และตารางสั้น ๆ ที่ระบุ owner, สิ่งที่เชื่อม, tests, warnings และ blocker. ต้องอัปเดตสถานะใน [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) ผ่าน branch/PR ของตัวเองหรือส่ง completion report ให้ AI-0 ตรวจ. ต้องบอกด้วยว่า branch นี้ยังไม่ได้ merge ไป `main`; AI ตัวหลักจะเป็นผู้ตรวจ diff และรวมงานเอง. หากงานปิดได้ ให้ commit แยกหนึ่ง checkpoint แล้ว push branch ของตัวเองหรือส่ง patch/PR ตาม workflow ที่เจ้าของ Repository ใช้.
