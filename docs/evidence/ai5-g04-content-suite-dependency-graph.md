# AI-5 G-04 Content Suite Dependency Graph Checkpoint

## TASK CLAIM

| Field | Value |
|---|---|
| Task ID | `G-04` |
| Requirement | Reusable Content Generation Suite definition/model/texture/skin/variant/gameplay |
| Owner | AI-5 |
| Branch/worktree | `ai-5/g04-content-suite-dependency-graph` / `/home/ubuntu/A_Survival-ai5-g04-graph` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `server/generators/contentSuiteDependencyGraph.ts`, `server/contentSuiteDependencyGraph.test.ts`, `docs/evidence/ai5-g04-content-suite-dependency-graph.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint scope

สร้าง pure/read-only dependency graph สำหรับ `ContentSuiteBundle` ที่มีอยู่จริง โดยเชื่อม definition, model, texture, skin, gameplay และ variant เข้าหากันด้วย `validateGeneratorDependencyGraph` ของ repository พร้อม summary และ required blockers สำหรับ asset ที่ยัง `awaiting-asset`. กราฟจะ deterministic, bounded และคง policy `{ runtimeImportAllowed:false, playerVisible:false, cacheable:false }`.

งานนี้ไม่สร้าง PNG/GLB/texture/model ไม่เรียก network, database, browser cache หรือ IndexedDB ไม่แก้ Workbench/router/map policy/authority และไม่เปิด runtime import หรือ player generator UI.

## Scope adjustment

ระหว่าง `pnpm check` พบว่า graph import `tools/contentRegistry.ts` เข้ามาอยู่ใน TypeScript program และเปิดเผย compatibility error เดิมจากการ spread `Set` ภายใต้ target ปัจจุบัน จึงขยาย exact reservation ให้รวม `tools/contentRegistry.ts` เฉพาะการเปลี่ยน expression เป็น `Array.from(new Set(...))` เพื่อให้ compile ได้เทียบเท่าเดิม โดยไม่เปลี่ยน behavior หรือขอบเขตของ content suite.

## TASK COMPLETE

| Field | Value |
|---|---|
| Task ID | `G-04` |
| Requirement | Reusable Content Generation Suite definition/model/texture/skin/variant/gameplay |
| Owner | AI-5 |
| Branch | `ai-5/g04-content-suite-dependency-graph` |
| Commit SHA | ตรวจจาก `git rev-parse HEAD` ของ branch นี้; SHA สุดท้ายส่งใน completion report |
| Files changed | `server/generators/contentSuiteDependencyGraph.ts`, `server/contentSuiteDependencyGraph.test.ts`, `tools/contentRegistry.ts`, `docs/evidence/ai5-g04-content-suite-dependency-graph.md` |
| Checks | `git diff --check` ผ่าน; focused `pnpm exec vitest run server/contentSuiteDependencyGraph.test.ts`: 1 file / 4 tests ผ่าน; `pnpm check` ผ่าน; full `pnpm exec vitest run`: 121 files / 504 tests ผ่าน; `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Result | graph เชื่อม component จริงทั้ง definition/model/texture/skin/gameplay/variant, ตรวจ asset binding แบบ fail-closed, รายงาน unresolved references, คง required blockers สำหรับ `awaiting-asset`/`reference-only`, deterministic sampling และ runtime denial policy; duplicate definition IDs และ malformed bundle hashes ถูกปิดกั้น |
| Blockers/limitations | graph เป็น read-only preview เท่านั้น ไม่สร้าง binary asset ไม่เปิด runtime import ไม่เพิ่ม player UI ไม่เขียน persistence/database/cache ไม่ขยาย future map และไม่ใช่ device/mobile acceptance; `cacheKey` ของ bundle เดิมตรวจได้เฉพาะรูปแบบ SHA-256 เพราะไม่มี canonical input ใน bundle สำหรับ recompute |
| Merge request | branch ถูก push ไป origin; ยังไม่ได้เปิด PR จาก sandbox นี้ |
| Status requested | `DONE` หลัง AI-0 ตรวจ diff/source/evidence; implementation ยังไม่ merge เข้า `main` |

## Validation warnings

Production build ผ่าน แต่มี warning เดิมจาก environment/configuration ได้แก่ `%VITE_ANALYTICS_ENDPOINT%` และ `%VITE_ANALYTICS_WEBSITE_ID%` ไม่ได้กำหนด, external analytics script ไม่มี `type="module"`, และมี vendor chunk ขนาดเกิน 1 MB. ไม่มี warning ใดเกิดจาก graph checkpoint โดยตรง.
