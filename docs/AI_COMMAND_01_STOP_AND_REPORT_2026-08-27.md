> **SUPERSEDED — ห้ามใช้เป็นคำสั่งปัจจุบัน**
> ไฟล์นี้ถูกแทนที่ด้วย [`AI_COMMAND_01_AUTONOMOUS_WORKER_2026-08-27.md`](./AI_COMMAND_01_AUTONOMOUS_WORKER_2026-08-27.md). AI-1 ต้องใช้ไฟล์ autonomous worker ฉบับใหม่ ซึ่งกำหนดให้เลือกงานจาก backlog และทำต่อเนื่อง

# คำสั่ง AI-1 — หยุดงานและรอคำสั่งใหม่

วันที่: 27 สิงหาคม 2026
Repository: `apirak272543-ship-it/A_Survival`
ผู้ควบคุม integration: AI-0 / Main Integrator

## คำสั่งที่มีผลทันที

งานที่ AI-1 ได้รับมอบหมายในรอบก่อนหน้านี้ให้ถือว่า **หยุดแล้ว**. ห้ามเลือกงานใหม่จาก backlog เอง ห้าม claim งานใหม่ ห้ามแก้โค้ดเพิ่ม ห้ามสร้าง asset และห้ามเปิด checkpoint ใหม่จนกว่า AI-0 จะมอบหมาย `Task ID` โดยตรงในข้อความหรือใน Pull Request

ห้ามแก้ `main`, ห้าม push ตรงเข้า `main`, ห้าม force push, ห้าม reset, revert, force checkout, ลบ branch, ลบ recovery ref หรือทำความสะอาดไฟล์ที่ยังไม่ได้ commit. หากมี branch/worktree หรือไฟล์ที่ AI-1 ทำค้างอยู่ ให้เก็บไว้ตามเดิมและรายงานสถานะเท่านั้น อย่าเขียนทับหรือลบทิ้ง

## บริบทล่าสุดที่ต้องรับทราบ

A_Survival ใช้ Vite + React 19 + TypeScript + Babylon.js, Express/tRPC, Drizzle/MySQL, Dexie/IndexedDB และ Vitest. Runtime map ที่เล่น/เลือก/cache/offline-write ได้มีเพียง `obsidian-frontier`; future maps เป็น planned/backend data และห้ามถูกเปิดด้วยงานใด ๆ. Creator tools เป็นภาษาไทยและ developer-only สำหรับ GM/admin/master; preview เป็น read-only และไม่ใช่ gameplay control.

AI-0 เพิ่งปิด quest-reward dispatch contract ที่ implementation commit `333078e3f78e3647ba6643f98b76493dc982b726` และกำลังตรวจ bounded pending-action/persistence contract ใน reservation `NEXT-QUEST-REWARD-PERSISTENCE-001`. ณ repository truth ล่าสุด งานนี้มี implementation commit `05b27c1a16e51f741256d7b08d57e5ee579bb9eb` และ registry status `🟣 IN_REVIEW`; ห้ามแก้ไฟล์ใน reservation ดังกล่าว รวมถึง `CreatorDomainWorkbench`, `server/creatorRouter.ts`, `client/src/game/home/homeSystemV2.ts`, `server/syncActionValidation.ts`, `server/generators/questRewardDispatchDependencyGraph.ts` และ tests ที่เกี่ยวข้อง

Full Vitest ล่าสุดที่ผ่านก่อนการตรวจเอกสารคือ `108` test files / `428` tests. `pnpm check` ผ่านใน bounded validation; การรัน check/build รอบสุดท้ายที่เริ่มหลังจากนั้นถูกตัดก่อนมีผลยืนยันใหม่ ดังนั้นห้ามอ้างว่า checkpoint นี้เป็น `DONE` และห้ามแก้สถานะใน registry เอง

## สิ่งที่ให้ทำตอนนี้

ให้หยุดการทำงาน แล้วส่งรายงานสั้น ๆ กลับมาเท่านั้น โดยระบุ branch/worktree ที่ใช้, `git status --short --branch`, commit ล่าสุด, ไฟล์ที่เปลี่ยน, test/build ที่รันจริง และสิ่งที่ยังไม่ push หรือยังไม่ merge. หากไม่มี branch/PR/commit ของ AI-1 ให้รายงานว่า `NO CONTRIBUTION FOUND` ได้เลย ห้ามสร้างงานทดแทนเพื่อให้มีผลงาน

รอคำสั่งใหม่จาก AI-0 เท่านั้น. การมีแถว `AVAILABLE` ใน `AI_COORDINATION_BACKLOG.md` ไม่ใช่การมอบหมายงาน. เมื่อได้รับงานใหม่ต้องอ่าน [`AI_COORDINATION_REGISTRY.md`](./AI_COORDINATION_REGISTRY.md) และ [`AI_COORDINATION_BACKLOG.md`](./AI_COORDINATION_BACKLOG.md) ก่อน claim เสมอ

## การรายงานที่ห้ามทำ

ห้ามรายงานว่างานเสร็จเพียงเพราะเขียนโค้ดแล้ว ห้าม mark `DONE` เอง ห้ามอ้าง authenticated creator E2E, mobile/device benchmark, live DB/storage, runtime publish/import/cache หรือ gameplay completion หากไม่มีหลักฐานตรงจาก repository และการทดสอบจริง
