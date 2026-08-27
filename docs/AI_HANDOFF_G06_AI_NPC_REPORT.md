# G-06 — รายงาน Optional AI NPC Provider Checkpoint

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `G-06` ใน repository `apirak272543-ship-it/A_Survival` โดยสร้าง pure dependency-graph audit สำหรับ optional AI NPC provider จาก service/config source จริง. ตรวจ one-special-NPC map, server-only/on-demand/default-disabled policy, provider/model/endpoint, action/cooldown/turn/timeout/message caps, fallback reasons, response schema และการปิด browser secret/background loop โดยไม่เรียก provider จริงและไม่แก้ runtime owner

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry/matrix ตามหลักฐานจริง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| map/NPC scope | allowed map และจำนวน special NPC | source ปัจจุบันมี `obsidian-frontier` เพียง `1` map; graph บังคับ one-map และตรวจ duplicate/unknown map | map count ไม่ใช่ 1, duplicate map หรือ future/unsupported map เป็น required blocker | focused G-06 suite ผ่าน 1 file / 5 tests; canonical map test ผ่าน |
| provider config | provider, model และ endpoint | provider คือ Gemini; model default `gemini-3.7-flash`; endpoint เป็น Google Generative Language interactions endpoint; audit ใช้ config object ไม่ทำ outbound call | provider/model/endpoint mismatch เป็น blocker; ไม่มี browser provider credential หรือ fallback ไป provider อื่น | source-boundary test ยืนยัน endpoint/fallback และไม่มี network call |
| default/on-demand | enabled flag และ invocation mode | `readAiNpcConfig({})` ให้ `defaultEnabled: false`; policy ระบุ on-demand และไม่มี background loop | default enabled, on-demand false หรือ background loop allowed เป็น blocker | canonical policy test และ invalid-config test ผ่าน |
| action/cap safety | max action, cooldown, turns, timeout, message length | canonical values คือ maxActions `1`, cooldown `10,000 ms`, maxTurns `8`, timeout `7,000 ms`, max message `300`; caps ถูกตรวจในช่วงที่ service กำหนด | cap หลุดช่วง, action มากกว่า 1, หรือ player-facing mutation path เป็น blocker | invalid fixture ตรวจ action/cooldown/turn/timeout/message blockers |
| server boundary | server-only และ browser secret | `serverOnly: true`, `browserSecretAllowed: false`; audit ไม่มี client secret หรือ provider invocation | server-only violation หรือ browser secret allowed เป็น blocker; ไม่มีการแก้ client caller | invalid test injects both violations แล้ว graph invalid |
| fallback safety | disabled/unsupported/invalid/cooldown/provider-error/invalid-output และ fallback action | fallback reasons ครบ `6`; fallback action type เป็น `none`; service contract ไม่อ้าง reward/inventory/block/database mutation | fallback reason หายหรือ fallback action unsafe เป็น blocker | invalid test ตรวจ missing fallback reasons `5` และ unsafe action |
| response schema | speech/mood/action required fields | required fields ครบ `speech`, `mood`, `action`; output audit ไม่สร้าง provider output | incomplete response schema เป็น blocker; ไม่มีการอ้าง provider success/production quality | canonical/invalid schema tests ผ่าน |
| central dependency graph | deterministic hash, required blockers และ runtime policy | graph ใช้ `validateGeneratorDependencyGraph`; invalid config/map สร้าง required missing dependency; runtime policy คง `{ runtimeImportAllowed: false, playerVisible: false, cacheable: false }` | graph ไม่ใช่ runtime execution หรือ background worker; ไม่มี provider call, DB write หรือ map unlock | tests determinism, hash sensitivity, blockers และ bounds ผ่าน |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `server/generators/aiNpcProviderDependencyGraph.ts` | เพิ่ม pure G-06 provider-policy adapter สำหรับ one-map/default-disabled/server-only/on-demand/fallback/cap/schema gates |
| `server/aiNpcProviderDependencyGraph.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical contract, no outbound boundary, invalid flags, hash และ bounds |
| `docs/AI_HANDOFF_G06_AI_NPC_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ `server/aiNpcService.ts`, `server/_core/llm.ts`, `client/src/game/scene.ts`, `client/src/game/data/maps.ts` หรือ runtime NPC caller. ไม่มีการเรียก Gemini/API จริงใน audit หรือ tests, ไม่มี browser secret, ไม่มี background loop, ไม่มี map unlock, ไม่มี gameplay mutation, ไม่มี DB write, ไม่มี asset generation, ไม่มี secret/token และไม่มีการแก้ Workbench/router, map/cache/offline/authority/schema

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `G-06` |
| Requirement | optional one AI NPC/map, server-only/on-demand/default disabled |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/ai-npc-g06` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `c3a859dd215f128ff32a52d5aeab86d8a08fc5c4` (`origin/main` หลัง fetch ล่าสุด) |
| Files reserved | `server/generators/aiNpcProviderDependencyGraph.ts`, `server/aiNpcProviderDependencyGraph.test.ts`, `docs/AI_HANDOFF_G06_AI_NPC_REPORT.md` |
| Implementation commit | `924b2b76c9854f804ff1d241fdefc6741b8c7060` (`924b2b7`) |
| Remote branch | `origin/ai-2/ai-npc-g06` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Git status | clean ก่อนรายงาน commit; implementation `git diff --check` ผ่าน |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused G-06 suite | ผ่าน `1` test file / `5` tests |
| Full test suite | ผ่าน `117` test files / `482` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต G-06 audit

## Result และ blockers/limitations

สิ่งที่พิสูจน์ได้คือ source config รองรับ bounded optional provider สำหรับ special AI NPC เพียง `obsidian-frontier` map เดียว, ปิดโดย default, เรียกแบบ on-demand, จำกัด action ต่อ turn ที่ `1`, มี timeout/cooldown/message/turn caps, มี fallback non-mutating และบังคับ response schema. Audit ไม่เรียก provider จริงและรักษา runtime graph policy แบบปิด

Checkpoint นี้ยังไม่ปิด G-06 ทั้งข้อเป็น `VERIFIED`. ยังไม่มีการทดสอบ provider จริง, live secret configuration, authenticated route, browser/mobile interaction, production latency/reliability หรือ end-to-end NPC caller acceptance. การตรวจนี้เป็น provider policy/configuration evidence เท่านั้น ไม่ใช่การประกาศว่า AI dialogue ใช้งานจริงครบหรือพร้อม production

AI-0 ควรตรวจ diff ของ commit `924b2b7`, ตรวจ report และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องเปิด provider runtime จริง ให้เปิด checkpoint แยกสำหรับ server service/caller พร้อม secret handling, timeout/error telemetry และ authenticated interaction evidence; ห้ามเปิด default หรือเพิ่ม background loop โดยอาศัย pure audit นี้
