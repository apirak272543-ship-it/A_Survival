# A_Survival AI Coordination Registry

เอกสารนี้เป็น **ทะเบียนกลางของการแบ่งงานและการจองไฟล์** สำหรับ AI สามตัวใน Repository `apirak272543-ship-it/A_Survival` โดย AI-0 เป็นผู้ประสานงานหลักและผู้ตรวจรับบน `main` ทุกสถานะต้องอ้างอิงจาก repository, branch, commit, diff และผลตรวจจริง ไม่ใช่จากข้อความในแชตเพียงอย่างเดียว

> กฎสั้น: อ่านทะเบียนก่อนแก้ทุกครั้ง, ห้ามแตะไฟล์ที่มี owner อื่นจองอยู่, ห้าม push ตรงเข้า `main` จาก AI-1/AI-2, และห้ามเปลี่ยนสถานะเป็นสีเขียวจนกว่าจะมี commit SHA กับผลตรวจที่ตรวจซ้ำได้

## สถานะกลาง

| เครื่องหมาย | สถานะ | ความหมาย |
|---|---|---|
| 🟢 DONE | เสร็จและตรวจรับแล้ว | มี commit ที่ระบุได้, diff อยู่ใน scope, tests/check/build ตามความเหมาะสมผ่าน และ AI-0 ตรวจรับแล้ว |
| 🔵 IN_PROGRESS | กำลังทำ | มี owner และมีไฟล์ที่จอง ห้าม AI อื่นแก้ไฟล์เดียวกัน |
| 🟡 RESERVED | จองแล้ว รอเริ่มหรือรอส่งหลักฐาน | owner รับงานแล้ว แต่ยังไม่มีหลักฐานเสร็จครบ |
| 🔴 BLOCKED | ติด blocker | ห้ามแก้ด้วยการเดาหรือปิด blocker; ต้องรายงานเหตุผลและ dependency ที่ขาด |
| ⚪ WAITING_EVIDENCE | อ้างว่าทำแล้วแต่ repository ยังไม่มีหลักฐานรับงาน | ต้องส่ง branch/PR/SHA/diff/test summary ก่อน AI-0 จะเปลี่ยนเป็น DONE |
| ⬜ AVAILABLE | ยังไม่มี owner | AI-0 เป็นผู้มอบหมายและต้องลงทะเบียนก่อนเริ่ม |

## สถานะ repository ณ 2026-08-27

| รายการ | ค่าที่ตรวจได้ |
|---|---|
| Repository | `apirak272543-ship-it/A_Survival` |
| Branch หลัก | `main` |
| HEAD และ `origin/main` | `08b9d6de9cfc87ae5d29eb181cea39d97e2de062` |
| Recovery ref ที่ต้องรักษา | `local-recovery-46a4812 -> 46a48125ab0377063cbad77bdd46edb864cc70c2` |
| Stash | ว่าง ณ การตรวจล่าสุด |
| Dev/test process | ไม่พบ process ที่ต้องหยุด ณ การตรวจล่าสุด |
| สถานะล่าสุด | working tree มี reservation ของ AI-0 สองไฟล์สำหรับ quest reward → inventory checkpoint; ยังไม่ commit |

## ทะเบียนงานและ file reservation

| Task ID | Owner | สถานะ | ขอบเขตและไฟล์ที่จอง | Base/commit evidence | การกระทำถัดไป |
|---|---|---|---|---|---|
| `MAIN-REWARD-INVENTORY-001` | AI-0 / Main Integrator | 🔵 IN_PROGRESS | `server/generators/questRewardInventoryDependencyGraph.ts`, `server/questRewardInventoryDependencyGraph.test.ts`; ห้าม AI-1/AI-2 แตะสองไฟล์นี้ | Base `2d0a220`; uncommitted ใน working tree ของ AI-0 | ตรวจ focused/full tests, ต่อ route/Workbench เมื่อจำเป็น, บันทึก evidence แล้ว commit/push เป็น checkpoint แยก |
| `AI1-PERF-001` | AI-1 | ⚪ WAITING_EVIDENCE | Performance profile → runtime visibility/telemetry/profiler; reserved files: `server/generators/runtimePerformanceContract.ts`, `server/runtimePerformanceContract.test.ts`; ใช้เฉพาะ owner/test ใน `AI_HANDOFF_01_RUNTIME_PERFORMANCE.md`; ห้ามแก้ Workbench, router authorization, map/cache/offline/authority หรือไฟล์ใน reservation ของ AI-0 | Base `4fcb65c`; branch `ai1/runtime-performance-visibility`; commit `a76f4da3ccfc619b2973107c00af228b5e12f837` pushed to `origin/ai1/runtime-performance-visibility`; focused 5 files/21 tests, full 102 files/397 tests, `pnpm check`, `git diff --check`, production build ผ่าน | รอ AI-0 ตรวจ diff และหลักฐาน แล้วเปลี่ยนเป็น 🟢 DONE หรือแจ้ง blocker |
| `AI2-CONTENT-001` | AI-2 | 🟡 RESERVED | Content generator / plant / asset provenance; ใช้เฉพาะ owner/test ใน `AI_HANDOFF_02_CONTENT_PROVENANCE.md`; ห้ามสร้าง PNG/GLB, แก้ Workbench/router, map policy, authority หรือไฟล์ใน reservation ของ AI-0 | ต้องส่ง branch/PR/SHA; ณ การตรวจล่าสุดยังไม่พบ remote branch หรือ PR ของ AI-2 | อ่าน registry และ handoff, ประกาศ branch/ไฟล์ที่จะจอง, ทำหนึ่ง bounded provenance checkpoint, ส่ง evidence กลับ AI-0 |
| `NEXT-QUEST-REWARD-DISPATCH-001` | AI-0 | ⬜ AVAILABLE | ออกแบบ canonical quest reward dispatch หลัง inventory checkpoint ผ่านเท่านั้น; ต้องแยกจาก read-only graph และห้าม fabricate completion | ยังไม่มี reservation | ห้ามเริ่มจนกว่า `MAIN-REWARD-INVENTORY-001` จะเป็น 🟢 DONE และมี design/acceptance ที่ชัดเจน |
| `NEXT-PERF-CAPABILITY-001` | AI-1 หรือ AI-0 ตามการมอบหมาย | ⬜ AVAILABLE | ตรวจ capability/benchmark หรือ profiler contract ต่อจาก T-01 โดยไม่อ้าง mobile acceptance หากไม่มี device evidence | ยังไม่มี reservation | AI-0 จะมอบหมายหลัง AI-1 ส่ง evidence ของ `AI1-PERF-001` |
| `NEXT-ASSET-PROVENANCE-001` | AI-2 หรือ AI-0 ตามการมอบหมาย | ⬜ AVAILABLE | เชื่อม plant/item/asset provenance กับ manifest หรือ required blockers ต่อจาก T-04/F-01 โดยไม่สร้าง graphical assets | ยังไม่มี reservation | AI-0 จะมอบหมายหลัง AI-2 ส่ง evidence ของ `AI2-CONTENT-001` |

## File ownership rules

AI-0 เป็นเจ้าของ `main` และเป็นผู้เดียวที่ merge หรือแก้ไขทะเบียนนี้หลังตรวจหลักฐานแล้ว. AI-1 และ AI-2 ต้องทำงานบน branch/worktree ของตนเอง เช่น `ai-1/perf-<task-id>` และ `ai-2/content-<task-id>` ห้ามใช้ working tree เดียวกับ AI-0 และห้าม push แบบ force หรือ push ตรงเข้า `main`.

การจองไฟล์ต้องเป็น **exclusive lock** ระหว่าง checkpoint. หากต้องแก้ไฟล์ที่มี owner อื่นจองอยู่ ให้หยุดและส่งคำขอ conflict review ผ่าน PR/issue หรือข้อความถึง AI-0; ห้ามแก้ก่อนอนุมัติ. ไฟล์ที่ไม่ได้อยู่ในขอบเขต handoff ถือเป็น `⬜ AVAILABLE` แต่ไม่ได้แปลว่าแก้ได้ทันที ต้องค้น source of truth และลงทะเบียน task ก่อนเสมอ.

การปิดงานไม่ใช้เพียงคำว่า “เสร็จแล้ว”. สถานะ `🟢 DONE` ต้องมีชื่อ branch, commit SHA, รายการไฟล์, `git diff --check`, `pnpm check`, focused tests และ full tests/build เมื่อ scope กระทบ client/server bundle พร้อมข้อจำกัดที่ยังตรวจไม่ได้. ถ้าไม่มี branch/PR/SHA หรือหลักฐานไม่อยู่ใน repository ให้ใช้ `⚪ WAITING_EVIDENCE` แทน.

## รูปแบบประกาศรับงาน

ก่อนเริ่ม AI-1/AI-2 ต้องส่งข้อความหรือ PR description ตามรูปแบบนี้:

```text
TASK CLAIM
Task ID: AI1-PERF-001 หรือ AI2-CONTENT-001
Owner: AI-1 หรือ AI-2
Branch/worktree: <ชื่อจริง>
Base SHA: <SHA ที่ checkout จาก main>
Files reserved: <รายการไฟล์แบบ exact path>
Status: RESERVED -> IN_PROGRESS
Forbidden scope acknowledged: yes
```

## รูปแบบรายงานปิดงาน

```text
TASK COMPLETE
Task ID: <task id>
Owner: <AI-1/AI-2>
Branch: <ชื่อ branch>
Commit SHA: <full SHA>
Files changed: <รายการไฟล์>
Checks: git diff --check; pnpm check; focused tests; full tests/build ตาม scope
Result: <สิ่งที่พิสูจน์ได้>
Blockers/limitations: <สิ่งที่ยังไม่ผ่าน>
Merge request: <PR URL หรือยังไม่เปิด>
Status requested: GREEN / DONE หรือ RED / BLOCKED
```

AI-0 จะตรวจ claim และ completion report กับ source จริงก่อนแก้แถวสถานะเป็นสีเขียว. การ merge ต้องเป็น checkpoint แยก, matrix SHA correction ต้องเป็น docs commit แยก และทุกคนต้องรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ selectable/playable/cache-eligible/offline-write ได้.

## ช่องทางสื่อสารเมื่อไม่ใช้ไฟล์ handoff

Repository นี้ไม่มีช่องแชตภายในระหว่าง AI โดยอัตโนมัติ. ช่องทางที่ใช้งานแทนได้คือ GitHub branch/PR/issue comment โดยให้ PR title ขึ้นต้นด้วย `[AI-1][AI1-PERF-001]` หรือ `[AI-2][AI2-CONTENT-001]`; AI-0 จะอ่าน diff และ review comment ก่อนรับงาน. ห้ามใช้ issue/PR เป็นข้ออ้างในการข้าม file reservation หรือข้าม test evidence.

## ข้อห้ามร่วม

ห้าม `reset`, `revert`, force checkout, force push, ลบ recovery ref, ลบหรือ overwrite งานของ owner อื่น, เพิ่ม secret/password/token, ทำ live migration/db push, เปิด future map, เอา preview graph ไปเป็น player control, fabricate quest completion/reward/ability unlock หรืออ้าง authenticated/device/mobile/production acceptance ที่ยังไม่มีหลักฐาน
