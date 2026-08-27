# S-04 — รายงาน Adaptive Performance Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded สำหรับข้อกำหนด `S-04` ใน repository `apirak272543-ship-it/A_Survival` โดยเพิ่ม pure dependency-graph audit ที่เชื่อม source จริงของ capability advice, static performance budgets, render-distance/culling, bounded telemetry sampler และ preview-only profiler. Audit ตรวจ explicit gaps ของ adaptive tier controller, runtime LOD, hysteresis, object pooling และ sleep/wake แล้วแปลงเป็น required missing dependencies แบบ fail-closed

> งานนี้เป็น **audit/evidence checkpoint** ไม่ใช่การเพิ่ม adaptive runtime controller และยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดต registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| capability | WebGL/WebGL2/WebGPU, CPU/memory/storage/touch/viewport normalization และ tier advice | มี one-time capability probe แบบ heuristic/conservative; default sample แนะนำ `balanced`; weak capability แนะนำ `low`; ไม่ auto-apply | capability advice ไม่ใช่ device benchmark และไม่เปลี่ยน tier เอง | focused S-04 suite ผ่าน 1 file / 5 tests; test weak capability ตรวจ low advice และ claims false |
| static performance profile | `PERFORMANCE_TIERS` และ `PERFORMANCE_BUDGETS` | มี 3 tier: `low`, `balanced`, `high`; มี max view distance/FPS, mob/animation/physics radii, particle, shadow และ `lodPolicy` | เป็น static budget; ไม่มี adaptive controller ผู้ใช้จริง | summary ตรวจ tier count, budget และ `lodPolicy` ครบ |
| render distance / culling | requested view distance, visible/prefetch radius และ near-player runtime visibility | balanced sample normalize เป็น 35 blocks, visible radius 35, prefetch radius 47; near object เปิด, object เกิน radius ปิด, broken object ปิด | culling มี owner แล้ว แต่ยังไม่มี adaptive controller ที่สั่ง budget จาก telemetry | focused test ตรวจ render-distance values และ 3 visibility outcomes |
| telemetry | bounded sample window และ frame-sample buffer | default window `1,000 ms`, max frame samples `120`; snapshot มี rendered/throttled/average/p95/worst frame metrics | telemetry เป็น sampler ไม่ใช่ adaptive decision loop | focused test ตรวจ default และ custom `500 ms`/`8` samples; full suite ผ่าน |
| profiler | snapshot interpretation และ recommendations | profiler เป็น preview-only; คำนวณ observed FPS/cadence/active mesh ratio และให้คำแนะนำ `watch/action` ได้ | claims `deviceBenchmark:false`, `adaptiveTiering:false`, `playerRuntimeMutation:false`, `networkPersistence:false` | summary และ focused test ตรวจ observation-only claims |
| runtime LOD | `lodPolicy` ใน static budget | มี policy metadata (`aggressive`/`balanced`/`detailed`) | **`lod-runtime-owner-missing`**; ยังไม่มี owner ที่ใช้ LOD runtime จริง | graph มี required missing dependency `owner:performance:lod-runtime` |
| adaptive tier controller | capability + telemetry → tier application | ยังไม่มี owner สำหรับการเลือก/เปลี่ยน tier ระหว่าง runtime | **`adaptive-tier-controller-owner-missing`** | graph มี required missing dependency `owner:performance:adaptive-controller` |
| hysteresis | anti-flapping transition policy | ไม่พบ runtime owner หรือ transition state machine | **`hysteresis-owner-missing`** | graph มี required missing dependency `owner:performance:hysteresis` |
| pooling | object/mesh reuse policy | ไม่พบ pool owner ที่ตรวจยืนยันได้ใน scope นี้ | **`pooling-owner-missing`** | graph มี required missing dependency `owner:performance:pooling` |
| sleep/wake | off-screen/background object lifecycle | ไม่พบ sleep/wake owner หรือ wake policy | **`sleep-wake-owner-missing`** | graph มี required missing dependency `owner:performance:sleep-wake` |
| runtime boundary | adapter behavior | deterministic, bounded, pure/read-only; ไม่มี render-loop mutation, player UI, browser cache/IndexedDB/network/DB write หรือ binary asset | output ไม่ใช่ performance acceptance บนเครื่องจริง | graph runtime policy บังคับ `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` |

## สิ่งที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/adaptivePerformanceDependencyGraph.ts` | เพิ่ม pure S-04 adapter ที่สร้าง bounded summaries, source dependency nodes, static budget/culling/telemetry/profiler previews และ required blockers |
| `server/adaptivePerformanceDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical owners, weak capability, fail-closed missing owners, determinism/hash sensitivity และ input bounds |
| `docs/AI_HANDOFF_S04_ADAPTIVE_PERFORMANCE_REPORT.md` | รายงานภาษาไทยฉบับนี้; ไม่แก้ registry หรือ owner matrix |

ไม่ได้แก้ `client/src/game/systems/performanceProfile.ts`, `runtimePerformanceCapability.ts`, `runtimeVisibilitySystem.ts`, `runtimePerformanceTelemetry.ts`, `renderDistance.ts`, `server/generators/runtimePerformanceProfiler.ts`, `scene.ts`, GameCanvas, Workbench/router, map/cache/offline/authority/schema หรือไฟล์ใน open AI-1 performance PR. ไม่มี render-loop mutation, LOD mesh mutation, auto tier application, pooling, sleep/wake, device/GPU benchmark, secret/token, network call, database write, migration/db push หรือ asset generation

## Branch, claim และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `S-04` |
| Requirement | adaptive performance tiers/WebGL/LOD/culling/pooling/hysteresis/sleep-wake |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/adaptive-performance-s04` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จาก origin/main | `cc80fd39a752d7c2837474a8ef52bce46cfb250e` |
| Exact reservations | `server/generators/adaptivePerformanceDependencyGraph.ts`, `server/adaptivePerformanceDependencyGraph.test.ts`, `docs/AI_HANDOFF_S04_ADAPTIVE_PERFORMANCE_REPORT.md` |
| Implementation commit | `f59042b4091e0f73e287beafb135144aef1763b7` (`f59042b`) |
| Registry/matrix | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` หรือ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น final owner |
| Git safety | ไม่ใช้ reset/revert/force checkout/force push; ไม่ลบ recovery ref และไม่แก้ stash/worktree ของ owner อื่น |

## Validation evidence ที่รันจริง

| Check | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน TypeScript `tsc --noEmit` |
| Focused | `pnpm exec vitest run server/adaptivePerformanceDependencyGraph.test.ts` ผ่าน `1` file / `5` tests |
| Full | `pnpm test -- --run` ผ่าน `118` files / `488` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่านทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน S-04 ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาด `3,553.16 kB` และเกิน 1 MB หลัง minification, และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. Warning เหล่านี้อยู่นอก exact S-04 scope

## Result, blocker และ limitations

สิ่งที่พิสูจน์ได้คือ repository มี bounded source owners สำหรับ one-time capability advice, static tier budgets, near-player distance culling, telemetry aggregation และ observation-only profiling. Pure graph ยังปิด runtime policy ทั้งหมดและไม่หลอกว่าคำแนะนำจาก capability/telemetry เป็น benchmark หรือ adaptive behavior จริง

Checkpoint นี้ยังไม่ปิด S-04 ทั้งข้อเป็น `VERIFIED` เพราะยังขาด adaptive tier controller, runtime LOD consumer, hysteresis, pooling และ sleep/wake owners. ยังไม่ได้พิสูจน์ real-device/GPU benchmark, 120 FPS guarantee, cross-platform WebGL/WebGPU behavior, production render-loop performance, mobile/WebView acceptance หรือ automated runtime tier switch. ห้ามนำ graph ไปเป็น player control หรือเปิด future map/cache/offline write

AI-0 ควรตรวจ implementation SHA `f59042b4091e0f73e287beafb135144aef1763b7`, report และ evidence ก่อน merge. หากจะ implement missing owners ให้เปิด checkpoint ใหม่พร้อม exact reservations แยกจาก AI-1 performance paths และคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
