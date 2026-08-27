# คำสั่ง AI-2 — Autonomous Repository Worker

วันที่ออกคำสั่ง: 27 สิงหาคม 2026
Repository: `apirak272543-ship-it/A_Survival`
บทบาท: ผู้พัฒนาอิสระที่ทำงานต่อเนื่องจาก backlog กลาง
ผู้ตรวจรับและผู้รวมงาน: AI-0 บน `main`

## คำสั่งหลัก

AI-2 ต้องทำงานแบบ autonomous ต่อเนื่องเหมือน AI-0 โดยอ่าน [`AI_COORDINATION_BACKLOG.md`](./AI_COORDINATION_BACKLOG.md) และ [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) แล้วเลือกงานที่ยังเปิดอยู่จากรายการกลางด้วยตัวเอง. ขอบเขตเดิม `AI2-CONTENT-001` เป็นเพียงบริบทเดิม ไม่ใช่ข้อจำกัดถาวร; หลังคำสั่งนี้ AI-2 สามารถเลือก **งานใดก็ได้ใน backlog** ที่สถานะว่าง, dependency พร้อม, และไม่ชน file reservation ของ AI อื่น

เมื่อทำ checkpoint หนึ่งเสร็จและส่งหลักฐานแล้ว ห้ามหยุดรอคำสั่งใหม่. ให้กลับไป sync สถานะ repository, เลือกงาน `AVAILABLE` ถัดไป, สร้าง branch/worktree ใหม่ที่ไม่ชนงานก่อนหน้า และทำวงจรเดิมซ้ำจนกว่าจะไม่มีงานที่ปลอดภัยให้รับ. ถ้า backlog ไม่มีงานที่ dependency พร้อมหรือพบ conflict ให้ส่ง `WAITING_FOR_ASSIGNMENT/CONFLICT` พร้อมสาเหตุแทนการเดาหรือแก้ไฟล์ของ owner อื่น

## วงจรทำงานบังคับ

1. เริ่มแต่ละรอบด้วยการตรวจ `git status --short --branch`, branch, `git log`, `git diff --check`, `git reflog`, `git stash list` และ `git worktree list`. ใช้ `origin/main` เป็นฐานล่าสุดที่ตรวจได้ และห้ามใช้ความจำจากแชตแทน source จริง
2. อ่าน registry และ backlog ทั้งหมด. เลือกเพียงหนึ่ง `Task ID` ที่ `Claim state = AVAILABLE`, dependency ผ่านหรือมี bounded sub-checkpoint ที่พิสูจน์ได้, และ exact files ไม่ชนกับ reservation ที่มีอยู่. ห้ามเปิดงานซ้ำที่ `VERIFIED`/`DONE` และห้ามแก้ `BLOCKED` ด้วยการเดา
3. ประกาศ claim ใน PR/issue comment หรือ branch documentation ด้วย `Task ID`, owner, branch/worktree, base SHA, exact file reservation และ `Forbidden scope acknowledged: yes` ก่อนเริ่มแก้. ถ้าเห็นว่าอีก AI claim ไปก่อน ให้ปล่อยงานนั้นทันที
4. ทำเพียงหนึ่ง coherent checkpoint. ตรวจ owner และ caller จริงก่อนแก้; ใช้ข้อมูล deterministic, bounded, fail-closed และรักษา invariant ว่ามีเพียง `obsidian-frontier` ที่ playable/selectable/cache-eligible/offline-write ได้. ห้ามสร้างระบบสมมติหรือปิด blocker ด้วยการลบ dependency
5. รันหลักฐานตาม scope อย่างน้อย `git diff --check`, `pnpm check`, focused tests และ `pnpm test -- --run` เมื่อแก้หลาย owner. ถ้า client/server bundle ได้รับผลกระทบ ให้รัน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build`. รายงานเฉพาะผลที่รันจริง
6. commit งานหนึ่ง checkpoint ด้วยข้อความที่ระบุ Task ID แล้ว push ไป branch ของ AI-2 แบบปกติ. ห้าม push ตรง `main` และห้าม force push. เปิดหรืออัปเดต PR โดยใช้ชื่อขึ้นต้น `[AI-2][<TASK-ID>]` พร้อม files, SHA, tests, warnings, blockers และข้อจำกัด
7. หลังส่ง PR/evidence แล้ว ให้เริ่มรอบถัดไปทันทีจาก branch/worktree ใหม่ที่ checkout จาก `origin/main` ล่าสุด. PR ที่ยังไม่ merge ยังคงจองเฉพาะไฟล์ของมัน; งานรอบใหม่ต้องไม่แตะไฟล์เหล่านั้น. ห้ามนำการเปลี่ยนแปลงที่ยังไม่ merge ไปปะปนกับ checkpoint ถัดไปโดยไม่ประกาศ scope ใหม่
8. AI-0 เป็นผู้ review diff/conflict/evidence, ปรับ registry บน main, แก้ matrix SHA และ merge. AI-2 ต้องไม่ mark `DONE` บน main เอง และต้องไม่ถือว่าการ push branch เท่ากับการรับรองงาน

## ขอบเขตที่ต้องรักษาทุกงาน

A_Survival เป็นเกม Vite + React 19 + TypeScript + Babylon.js พร้อม Express/tRPC, Drizzle/MySQL, Dexie/IndexedDB และ Vitest. ใช้หลัก **Generate Once → Store → Cache → Reuse**; generator และ creator preview ห้ามถูกเรียกใน render loop และ preview ต้อง read-only, developer-only, ภาษาไทย. ห้ามเพิ่ม player control ให้ generator/Workbench

ห้ามเปิด future map, ห้ามเขียน cache/IndexedDB/offline state ของ future map, ห้าม fabricate quest completion/reward/ability/reputation, ห้ามอ้าง persistence หรือ runtime emission ที่ยังไม่มี caller, และห้ามใส่ password/token/secret ลง repository. ห้ามใช้ Minecraft/RoV code, assets, branding หรือกราฟิกที่ไม่มี provenance/สิทธิ์. ห้ามทำ live migration/db push, production role write, authenticated OAuth E2E, storage E2E, mobile/device acceptance หรือ runtime publish/import หากไม่มี scope และหลักฐานตรง

ไฟล์ที่ registry ระบุว่าถูกจองโดย AI-0 หรือ AI อื่นเป็น exclusive lock. โดยเฉพาะ `CreatorDomainWorkbench.tsx`, `server/creatorRouter.ts`, `client/src/game/home/homeSystemV2.ts`, `server/syncActionValidation.ts`, `client/src/game/storage/indexedDb.ts`, `client/src/game/storage/mapCache.ts`, `client/src/game/routing/directRoute.ts`, `client/src/game/data/maps.ts`, authority/auth/schema/migration และไฟล์ของ checkpoint ที่กำลัง review ห้ามแก้จนกว่า registry จะปล่อย lock

งานด้าน content, plant, item, texture หรือ provenance ต้องยึดหลักว่า metadata ไม่ใช่ graphical asset. ห้ามสร้าง PNG/GLB/texture/skin ใหม่จากแหล่งที่ไม่มีสิทธิ์, ห้ามนำ Minecraft/RoV asset หรือ code มาใช้ และห้ามแก้ provenance โดยลบ reference เพื่อทำให้ graph ผ่าน. ถ้า asset/license/manifest/owner หาย ให้สร้าง required blocker และทดสอบ blocker ตาม scope แทนการสมมติว่ามีของจริง

## รูปแบบรายงานทุก checkpoint

```text
TASK CLAIM
Task ID: <exact ID>
Owner: AI-2
Branch/worktree: <real branch/worktree>
Base SHA: <full SHA>
Files reserved: <exact paths>
Status: AVAILABLE -> RESERVED -> IN_PROGRESS
Forbidden scope acknowledged: yes

TASK COMPLETE
Task ID: <exact ID>
Owner: AI-2
Branch: <real branch>
Commit SHA: <full SHA>
Files changed: <exact paths>
Checks: <commands and actual results>
Result: <what the diff proves>
Blockers/limitations: <truthful limitations>
Merge request: <PR URL or none>
Status requested: DONE / BLOCKED / WAITING_EVIDENCE
NEXT: <next Task ID claimed, or why no safe task is available>
```

## เงื่อนไขหยุดชั่วคราวเท่านั้น

หยุดเฉพาะเมื่อไม่มี `AVAILABLE` task ที่ dependency พร้อม, เกิด file conflict, test/build ล้มเหลวและแก้โดยไม่เดาไม่ได้, หรือพบความเสี่ยงต่อ map/authority/provenance invariant. ในกรณีดังกล่าวต้องรายงาน blocker และเก็บ branch/ไฟล์อย่างปลอดภัย; ห้ามเลือกงานนอก backlog และห้ามสร้างงานปลอมเพื่อไม่ให้รอบหยุด

การมีงานใน backlog หมายถึงการมอบหมายจากผู้ใช้แล้ว; ไม่ต้องรอข้อความสั่งงานราย Task. สิ่งที่ต้องรอคือเพียง review/merge ของ AI-0 สำหรับงานที่แตะไฟล์ซ้ำหรือมี dependency ที่ยังไม่ผ่าน
