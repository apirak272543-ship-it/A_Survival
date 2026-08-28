# T-02 — รายงาน Procedural Animation / Motion Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded สำหรับข้อกำหนด `T-02` ใน repository `apirak272543-ship-it/A_Survival` โดยเพิ่ม pure dependency-graph audit ที่เชื่อม animation profile generator, canonical motion policy และ asset-provenance boundary จาก source จริง. Audit ตรวจ 7 animation states, bounded FPS/profile validation, full/reduced/sleep/static distance policy, reduced-motion behavior, runtime asset reuse/fallback และ required gaps ของ runtime caller, variation, skeleton retarget, wind motion และ binary asset generation

> งานนี้เป็น **audit/evidence checkpoint** ไม่ใช่การสร้าง binary asset หรือการแก้ runtime animation caller และยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดต registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| animation profile generator | profile schema, identity, FPS และ canonical states | profile `survivor.default` มี 7 states: `idle`, `walk`, `run`, `dash`, `attack`, `hurt`, `dead`; default FPS `12`; generator validate FPS 1–60 | ไม่มี blocker ใน bounded profile generation | focused T-02 suite ผ่าน 1 file / 5 tests; canonical profile test ผ่าน |
| playback policy | generate-on-load, distance update, offscreen sleep, clip reuse | profile ระบุ `generateOnLoad:false`, `distanceBasedUpdate:true`, `sleepWhenOffscreen:true`, `runtimeAssetReuse:true` | policy metadata ไม่เท่ากับ runtime caller acceptance | focused motion tests ตรวจ playback policy และ graph เป็น audit-only |
| motion policy | distance/visibility/reduced-motion/dead-state | ตรวจได้ 5 decision: near/full, far/reduced, offscreen/sleep, reduced-motion/reduced และ dead/static; ไม่มี auto-kill หรือ fabricated physics | runtime caller owner ยัง missing ใน graph | focused test ตรวจ mode, animation LOD, asset fallback และ reasons |
| asset provenance | assetId/source/provenance reference | profile ผูก `assetId` กับ `provenanceRef`; `reference-only` input ถูกเก็บเป็น reference-only ไม่ถูกยกระดับเป็น runtime binary | binary animation asset generation owner ยัง missing | focused test ตรวจ reference-only boundary และ blocker |
| variation | state overrides/profile extensibility | generator input รองรับ bounded state overrides และสร้าง profile ได้ deterministic | **`runtime-variation-owner-missing`**; ยังไม่มี runtime variation/selection owner ใน checkpoint นี้ | graph มี required missing dependency `owner:animation:runtime-variation` |
| skeleton/retarget | skeleton retargeting | ไม่มีการอ้างว่า retarget skeleton สำเร็จ; source claims `skeletonRetargeted:false` | **`skeleton-retarget-owner-missing`** | graph required dependency และ claims false ตรวจได้ |
| wind motion | wind simulation/ambient motion | ไม่มี wind simulation ใน profile/motion preview | **`wind-motion-owner-missing`** | graph required dependency `owner:animation:wind-motion` |
| runtime caller | profile/policy application ใน scene/player runtime | checkpoint ไม่แก้ caller และไม่อ้าง runtime integration | **`runtime-animation-caller-owner-missing`** | graph required dependency `owner:animation:runtime-caller` |
| binary asset generation | PNG/GLB/texture/model output | ไม่มี binary generation; profile เป็น metadata/reference contract เท่านั้น | **`binary-animation-asset-generation-owner-missing`** หาก acceptance ต้องการสร้าง/จัดหา binary | graph required dependency; no asset bytes changed |
| runtime boundary | deterministic/fail-closed behavior | adapter pure/read-only, bounded และไม่ mutate render loop, player state, cache, persistence หรือ network; graph runtime policy ปิด | output ไม่ใช่ player animation acceptance หรือ device benchmark | `git diff --check`, `pnpm check`, focused/full/build ผ่าน |

## สิ่งที่เปลี่ยน

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/animationMotionDependencyGraph.ts` | เพิ่ม pure T-02 adapter สำหรับ canonical profile, seven-state coverage, motion decisions, provenance boundary และ required missing dependencies |
| `server/animationMotionDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ profile/policy, motion modes, reference-only asset boundary, determinism/hash และ input bounds |
| `docs/AI_HANDOFF_T02_ANIMATION_MOTION_REPORT.md` | รายงานภาษาไทยฉบับนี้; ไม่แก้ registry หรือ owner matrix |

ไม่ได้แก้ `server/generators/animationProfileGenerator.ts`, `client/src/game/systems/animationMotionPolicy.ts`, animation asset manifest/metadata, `scene.ts`, GameCanvas, Workbench/router, map/cache/offline/authority/schema หรือไฟล์ใน open worker PR. ไม่มี PNG/GLB/texture/model generation, skeleton retarget, wind simulation, render-loop mutation, player UI, network/DB write, migration/db push หรือ secret/token

## Branch, claim และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `T-02` |
| Requirement | procedural animation/motion generator |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/animation-motion-t02` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จาก origin/main | `9c559427ba1e4a29f4ae253b66c3432f2619b7a6` |
| Exact reservations | `server/generators/animationMotionDependencyGraph.ts`, `server/animationMotionDependencyGraph.test.ts`, `docs/AI_HANDOFF_T02_ANIMATION_MOTION_REPORT.md` |
| Implementation commit | `7572d942620d6fc84d70e6b87b3c66f62b077092` (`7572d94`) |
| Registry/matrix | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` หรือ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น final owner |
| Git safety | ไม่ใช้ reset/revert/force checkout/force push; ไม่ลบ recovery ref และไม่แก้ stash/worktree ของ owner อื่น |

## Validation evidence ที่รันจริง

| Check | ผล |
|---|---|
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน TypeScript `tsc --noEmit` |
| Focused | `pnpm exec vitest run server/animationMotionDependencyGraph.test.ts` ผ่าน `1` file / `5` tests |
| Full | `pnpm test -- --run` ผ่าน `118` files / `488` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่านทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน T-02 ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาด `3,553.16 kB` และเกิน 1 MB หลัง minification, และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. Warning เหล่านี้อยู่นอก exact T-02 scope

## Result, blocker และ limitations

สิ่งที่พิสูจน์ได้คือ canonical profile generator สร้าง profile 7 states แบบ deterministic, มี FPS bounds และ playback policy ที่แยก generate-on-load/distance update/offscreen sleep/asset reuse; motion policy ให้ผล full/reduced/sleep/static ตามระยะ visibility reduced-motion และ dead-state; asset reference มี provenance boundary และไม่ถูกตีความเป็น binary asset

Checkpoint นี้ยังไม่ปิด T-02 ทั้งข้อเป็น `VERIFIED` เพราะยังขาด runtime animation caller, runtime variation/selection, skeleton retarget, wind motion และ binary animation asset-generation owner. ยังไม่ได้พิสูจน์ real-time render-loop behavior, skeletal animation playback, asset loading/device performance, retarget correctness, wind simulation, mobile/WebView acceptance หรือ production visual acceptance. ห้ามนำ graph ไปเป็น player control และห้ามอ้างว่ามี binary asset ใหม่จาก checkpoint นี้

AI-0 ควรตรวจ implementation SHA `7572d942620d6fc84d70e6b87b3c66f62b077092`, report และ evidence ก่อน merge. หากจะเติม missing runtime owners ให้เปิด checkpoint ใหม่พร้อม exact reservations และคง invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้
