# B-07 — รายงาน World Storage / Chest Isolation Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded สำหรับข้อกำหนด `B-07` ใน repository `apirak272543-ship-it/A_Survival` โดยเพิ่ม pure dependency-graph audit สำหรับการแยก chest ออกจาก player carry, capacity ของ chest 27 ช่องและ carry 40 ช่อง, namespace แบบ `mapId+playerId`, transfer action ที่บันทึก `mapId`, การ normalize storage ที่ลบ duplicate instance และ fail-closed boundary สำหรับ universal world-storage integration ที่ยังไม่มี owner โดยตรง

> งานนี้เป็น **audit/evidence checkpoint** ไม่ใช่การแก้ runtime owner และยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดต registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| world storage runtime | `worldStorageSystem.ts` และ deterministic Obsidian anchor | source มี `OBSIDIAN_STORAGE_ID`, `STORAGE_CHEST_ID`, chest anchor บน `obsidian-frontier` และ `WORLD_STORAGE_DEFAULT_SLOTS = 27`; chest ถูกเก็บแยกจาก carry | ไม่มี blocker ใน bounded canonical source audit | focused B-07 suite ผ่าน 1 file / 5 tests; canonical summary ตรวจ anchor/capacity |
| player carry boundary | carry/chest transfer owner | carry limit canonical คือ `40`; withdrawal เมื่อ carry เต็มปฏิเสธและไม่ลบ chest contents | ยังไม่มี full cross-map transfer contract | existing `worldStorageSystem` contract ถูกเชื่อมเป็น required runtime node; ไม่แก้ runtime |
| chest capacity | fixed chest slots และ map storage state | chest ใช้ 27 ช่อง; `worldStorageById` เป็น state key แยกจาก inventory carry | universal world-state integration owner ยังไม่ครบ | graph summary ตรวจ `chestSlotLimit: 27`, `storageAnchorCapacity: 27` |
| map/player namespace | `OfflineMapState` และ Dexie key | storage ถูก normalize ใน `OfflineMapState.worldStorageById`; durable owner ใช้ composite `[mapId+playerId]` ทำให้ผู้เล่นและ map คนละ namespace | future-map storage ยังไม่ใช่ runtime-approved path | focused namespace test สร้าง `player-a`/`player-b` แยกกันและตรวจ hash ต่างกัน |
| transfer action | deposit/withdraw action payload | action preview บันทึก `mapId` และ canonical chest ID; validator owner ตรวจ `mapId === obsidian-frontier`, chest/slot/quantity bounds | ยังไม่พิสูจน์ end-to-end server application ของ state transition | summary ตรวจ `transferActionIsMapScoped: true`; sync-validator node เป็น required dependency |
| malformed/duplicate state | `normalizeWorldStorage` | malformed/invalid entries ถูกกรองและ duplicate `instanceId` เหลือเพียงหนึ่ง instance; storage ถูกเติม fixed-length slots | audit ไม่เขียนค่าที่ normalize กลับ persistence | focused canonical test ตรวจ `normalizedDuplicateInstanceRemoved: true` |
| future map guard | requested map != canonical map | `future-map` ให้ `mapIsRuntimeApproved: false`, `storageAnchorPresent: false` และ graph invalid; ไม่เปิด future-map storage | required blockers: `requested-map-not-runtime-approved`, `storage-anchor-missing` | focused fail-closed test ผ่าน; runtime policy ยังคงปิดทั้งหมด |
| universal world-state integration | cross-system owner | `universalStorageIntegrationOwnerPresent: false`; เพิ่ม required missing dependency `owner:world-storage:universal-world-state-integration` | **`universal-world-storage-integration-owner-missing`** | graph `valid: false`; issue `MISSING_REQUIRED_DEPENDENCY` ตรวจได้แน่นอน |
| runtime boundary | audit adapter | adapter deterministic, bounded, pure/read-only; ไม่มี IndexedDB/network/DB/browser write, player UI หรือ runtime import | output ไม่ใช่ storage grant และไม่ใช่ acceptance ของ device/production | graph policy บังคับ `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` |

## สิ่งที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/worldStorageIsolationDependencyGraph.ts` | เพิ่ม pure B-07 adapter สำหรับ chest/carry isolation, map-player namespace, transfer preview, normalization evidence และ required blockers |
| `server/worldStorageIsolationDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical boundary, namespace/hash, future-map fail-closed, determinism และ input bounds |
| `docs/AI_HANDOFF_B07_WORLD_STORAGE_REPORT.md` | รายงานภาษาไทยฉบับนี้; ไม่แก้ registry หรือ owner matrix |

ไม่ได้แก้ `client/src/game/systems/worldStorageSystem.ts`, `client/src/game/systems/inventorySystem.ts`, `client/src/game/storage/indexedDb.ts`, `server/syncActionValidation.ts`, `server/db.ts`, `ArcaneFrontier.tsx`, `GameCanvas.tsx`, Workbench/router, map/cache/offline/authority/schema หรือ binary asset. ไม่มี storage mutation, IndexedDB write, database write, migration/db push, secret/token, network call, future-map enablement หรือ asset generation

## Branch, claim และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `B-07` |
| Requirement | chest separate from carry and map-local |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/world-storage-b07` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จาก origin/main | `b5adcf60382b6d8a3f40e53b9f331c7dacf81132` |
| Exact reservations | `server/generators/worldStorageIsolationDependencyGraph.ts`, `server/worldStorageIsolationDependencyGraph.test.ts`, `docs/AI_HANDOFF_B07_WORLD_STORAGE_REPORT.md` |
| Implementation commit | `02830c85d02886f77177fa8e5d7a0d42c6366a17` (`02830c8`) |
| Registry/matrix | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` หรือ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น final owner |
| Git safety | ไม่ใช้ reset/revert/force checkout/force push; ไม่ลบ recovery ref และไม่แก้ stash/worktree ของ owner อื่น |

## Validation evidence ที่รันจริง

| Check | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน TypeScript `tsc --noEmit` |
| Focused | `pnpm exec vitest run server/worldStorageIsolationDependencyGraph.test.ts` ผ่าน `1` file / `5` tests |
| Full | `pnpm test -- --run` ผ่าน `118` files / `488` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่านทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน B-07 ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาด `3,553.16 kB` และเกิน 1 MB หลัง minification, และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. Warning เหล่านี้อยู่นอก exact B-07 scope

## Result, blocker และ limitations

หลักฐานที่ปิดได้ใน checkpoint นี้คือ chest เป็น container แยกจาก carry, canonical Obsidian chest มี 27 ช่อง, carry boundary คือ 40 ช่อง, storage state อยู่ใต้ `worldStorageById` ใน map/player namespace, transfer action ผูก `mapId`, malformed/duplicate state ถูก normalize แบบ fail-closed และ storage validator จำกัด runtime-approved map, chest, slot และ quantity ตาม source จริง

อย่างไรก็ตาม graph ตั้งใจเป็น `valid: false` เพราะไม่มี owner ที่ระบุได้สำหรับ **universal world-storage integration**; จึงไม่ประกาศว่า B-07 ทั้งข้อเป็น `VERIFIED`. ยังไม่ได้พิสูจน์ universal world-state merge, full multi-map transfer, authenticated sync application, conflict resolution, device/mobile acceptance, production persistence หรือ browser E2E ใหม่ใน checkpoint นี้. Adapter นี้ไม่ทำให้ future map playable/selectable/cache-eligible/offline-write และไม่อ้างว่าการ persist ข้าม map ทำงานสมบูรณ์

AI-0 ควรตรวจ implementation SHA `02830c85d02886f77177fa8e5d7a0d42c6366a17`, report และ evidence ก่อน merge. หากจะเติม universal integration หรือเปิด cross-map contract ให้เปิด checkpoint ใหม่พร้อม exact file reservation และคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
