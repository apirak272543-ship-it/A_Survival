# F-05 — รายงาน Plant Repel Radius / Stacking / Duration Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `F-05` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph adapter ที่ตรวจและจำลองกฎ non-lethal repel แบบ deterministic ได้แก่ active duration, radius/power caps, strongest-aura selection, deterministic tie-break, non-stackable behavior, health preservation และ capped time-step displacement. งานนี้ไม่แก้ runtime scene หรือ world-farming owner และไม่อ้าง browser/device acceptance

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| `client/src/game/systems/worldFarmingSystem.ts` source projection | repellent plant count, aura identity, radius/power source และ mature-only boundary ที่มีอยู่เดิม | current catalog มี 300 plant records และ repellent projection 60 รายการ; source aura ทุกตัวเป็น `aura:plant-###`, มี radius สูงสุด `6m` และ power สูงสุด `3` | source projection ปัจจุบันไม่มี `durationMs` ใน aura records จึงสร้าง `duration-missing` required blocker 60 รายการแบบ fail-closed แทนการเดา duration | focused suite ผ่าน 1 file / 6 tests; canonical test ยืนยัน issue count `duration-missing = 60` |
| bounded repel policy | active window และ duration cap | adapter ยอมรับ duration ที่เป็นจำนวนเต็มบวกไม่เกิน `30,000 ms`; aura หมดอายุเมื่อ `now >= activeFromMs + durationMs` และไม่ถูกเลือก | missing/zero/negative/over-cap duration เป็น blocker; source runtime duration ยังต้องเปิด checkpoint ใหม่หากต้องการปิด gap | test duration-aware source 2 auras ผ่าน valid graph; expired aura ถูก ignore |
| strongest-aura selection | radius inclusion, power priority และ deterministic tie-break | เลือก aura ที่ active และอยู่ใน radius เพียงหนึ่งรายการ โดยเลือก power สูงสุด; หาก power/distance เท่ากันใช้ `id` ที่เรียงแน่นอน | aura นอก radius หรือหมดอายุไม่ส่งผล; ไม่รวมผลหลาย aura เป็นการ stack | test ตรวจ strongest-only, equal-power ID tie-break, outside-radius และ no-active-aura |
| non-lethal movement boundary | displacement, delta clamp และ health | การจำลองขยับออกจาก aura ใช้ความเร็วคงที่ `1.35 m/s`, clamp `deltaSeconds` สูงสุด `0.25s`, และคืน health เดิมโดยไม่ลด HP | ไม่มี auto-kill, damage, direct enemy deletion หรือ health mutation ใน adapter; runtime scene caller ไม่ได้แก้ใน checkpoint นี้ | test `deltaSeconds = 10` ได้ displacement `0.3375m` และ health คง `34` |
| label/stacking policy | non-stackable และ disclosure | aura ที่ผ่านต้อง `stackable: false` และ label ต้องสื่อ non-lethal เช่น `ไม่ทำลายมอนสเตอร์` | stackable หรือ lethal/ambiguous label เป็น required blocker | test inject stackable aura และ label `ฆ่ามอนสเตอร์` แล้ว graph invalid |
| central dependency graph | source fingerprint, required blockers และ runtime boundary | graph ใช้ `validateGeneratorDependencyGraph`; hash เปลี่ยนเมื่อ source เปลี่ยน; runtime policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | blocker dependency จงใจไม่มี node ปลายทางเพื่อให้ central validator รายงาน `MISSING_REQUIRED_DEPENDENCY`; ไม่มี cache/offline/DB write | test determinism, source hash sensitivity, count/identity violations และ input bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/plantRepelBehaviorDependencyGraph.ts` | เพิ่ม pure F-05 adapter สำหรับ source audit, duration/radius/power/stacking/label validation, strongest active aura selector, expiry และ capped repel-step simulation |
| `server/plantRepelBehaviorDependencyGraph.test.ts` | เพิ่ม regression tests 6 รายการสำหรับ canonical duration gap, strongest-only selection, tie-break, expiry, health preservation, cap/blocker behavior, source hash และ bounds |
| `docs/AI_HANDOFF_F05_PLANT_REPEL_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `client/src/game/systems/worldFarmingSystem.ts`, `client/src/game/scene.ts`, `client/src/game/tools/plantCatalogGenerator.ts` หรือ `client/src/game/data/plantCatalog.ts` โดยตรง. ไม่มีการแก้ Workbench/router, map allow-list/cache/offline persistence, authority/auth/schema/migration, runtime render loop หรือ UI. ไม่มีการสร้าง PNG/GLB/texture/model, ไม่มี external generation, ไม่มี secret/token และไม่มี medical claim

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `F-05` |
| Requirement | non-lethal repel radius/stacking/duration |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/plant-repel-f05` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `97e58a65f2af5ce356cfabd80bffd56b21b6f955` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/plantRepelBehaviorDependencyGraph.ts`, `server/plantRepelBehaviorDependencyGraph.test.ts`, `docs/AI_HANDOFF_F05_PLANT_REPEL_REPORT.md` |
| Implementation commit | `7034b6e71f9c95fb5abe8ee9fd26d8961018f4a3` (`7034b6e`) |
| Remote branch | `origin/ai-2/plant-repel-f05` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean หลัง push; `git diff --check` ผ่านก่อน commit |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused F-05 suite | ผ่าน `1` test file / `6` tests |
| Full test suite | ผ่าน `112` test files / `450` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต F-05 adapter

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือมีกฎ pure deterministic สำหรับ active radius, strongest-only selection, deterministic tie-break, expiry, non-stackable/non-lethal disclosure, health preservation และ capped displacement โดยไม่ทำลายมอนสเตอร์หรือฆ่าอัตโนมัติ. Source ปัจจุบันมี repellent plants 60 รายการแต่ยังไม่ส่ง duration เข้า aura records ดังนั้น audit รายงาน `duration-missing` 60 รายการและ graph ไม่ผ่านแบบ fail-closed

Checkpoint นี้ยังไม่ปิด F-05 ทั้งข้อเป็น `VERIFIED`. ยังไม่มีการแก้ world-farm runtime ให้เก็บ duration, ไม่มี browser proof ที่มีศัตรูใกล้ฟาร์ม, ไม่มี device/mobile acceptance, ไม่มี persistence/rehydration และไม่มีการทดสอบผลจาก scene render loop จริง. การตรวจนี้จึงเป็น bounded policy/evidence เท่านั้น ไม่ใช่การประกาศว่า repel พร้อมใช้งานทุกเส้นทาง

AI-0 ควรตรวจ diff ของ commit `7034b6e`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องปิด duration gap หรือยืนยัน browser enemy behavior ให้เปิด checkpoint และ exact reservation ใหม่ โดยไม่ขยายงานนี้ย้อนหลัง
