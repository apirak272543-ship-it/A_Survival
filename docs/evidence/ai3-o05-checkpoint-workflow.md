# AI-3 O-05 Checkpoint Workflow Evidence

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `O-05` |
| Requirement | ทำทีละหน่วย ตรวจจริง matrix แล้ว commit/push ทันที |
| Owner | AI-3 |
| Branch/worktree | `ai3/o05-checkpoint-workflow` / `/home/ubuntu/A_Survival-o05` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-o05-checkpoint-workflow.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Checkpoint workflow ที่ปฏิบัติจริง

Checkpoint นี้บันทึก workflow แบบ bounded สำหรับ worker โดยแก้เฉพาะ evidence file ใหม่และไม่แก้ matrix หรือ registry ซึ่งเป็น owner ของ AI-0. ทุก checkpoint ของ AI-3 ถูกแยก branch/worktree จาก base ที่ตรวจได้, จำกัด file reservation เป็น exact path, ทำการตรวจ source/diff/test ตาม scope, commit แยกหนึ่งครั้ง และส่ง PR แยกให้ AI-0 review.

| Checkpoint | Branch | Base SHA | Commit SHA | PR | Scope |
|---|---|---|---|---|---|
| `O-01` | `ai3/o01-backlog-audit` | `d5501db302c2bbb7459f7fb636280673afc61683` | `1a54efc956f4b3687fb5bdc2720f7dcf44d0ba70` | [#40](https://github.com/apirak272543-ship-it/A_Survival/pull/40) | bounded backlog/registry audit evidence |
| `V-03` | `ai3/v03-asset-pack-boundary` | `2998e3478480a6187916cf86bb00af0f741acda2` | `d787bed86d0e13f1049f05eb4bdd40ce21de4b29` | [#43](https://github.com/apirak272543-ship-it/A_Survival/pull/43) | runtime asset-pack manifest validation |
| `M-03` | `ai3/m03-service-worker-boundary` | `6ef111c461dfde7d83f2cb2fbe89ea24c29049d4` | `56dd62184533afa06e7a9416030ef09b58d57dfa` | [#46](https://github.com/apirak272543-ship-it/A_Survival/pull/46) | service-worker runtime-map cache boundary |
| `B-01` | `ai3/b01-block-record-contract` | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` | `16eea3835b5b01327b91e2421d9aba3385eb9165` | [#49](https://github.com/apirak272543-ship-it/A_Survival/pull/49) | bounded block coordinate/state/action contract |

รายการข้างต้นเป็น evidence ของ isolated commits และไม่ได้หมายความว่า AI-0 merge หรือเปลี่ยนสถานะ requirement เป็น `DONE` แล้ว. แต่ละ PR ต้องผ่านการตรวจ base, diff, file conflict, tests, build และ invariant ตาม registry ก่อน.

## Source-of-truth and reservation gates

ก่อนเริ่ม checkpoint แต่ละรอบ ตรวจ `git status --short --branch`, `git log`, `git diff --check`, `origin/main`, worktree และรายการ reservation จาก `docs/AI_COORDINATION_REGISTRY.md`. เลือกเฉพาะ task ที่ backlog ระบุเป็น `AVAILABLE`, ตรวจ dependency และหลีกเลี่ยงไฟล์ที่ open PR หรือ AI-0 จองอยู่. งานที่อยู่ใน open PR ของ worker อื่นถูกถือเป็น review queue ไม่ใช่ implementation ที่ main รับรอง.

AI-3 ไม่แก้ `docs/OWNER_REQUIREMENTS_MATRIX.md` หรือ `docs/AI_COORDINATION_REGISTRY.md` โดยตรง เพราะ AI-0 เป็นผู้แก้ matrix/registry หลังตรวจหลักฐาน. การส่งสถานะทำผ่าน branch/PR และ completion report ที่ระบุ limitation อย่างตรงไปตรงมา.

## Validation gate

| Gate | Evidence policy |
|---|---|
| File scope | ใช้ exact file reservation; ไม่รวมงานหลายระบบใน commit เดียว |
| Source review | อ่าน owner และ caller ที่เกี่ยวข้องก่อนแก้; ไม่ใช้ข้อความในแชตแทน repository |
| Deterministic checks | รัน `git diff --check` และ `pnpm check` เมื่อ scope เป็น code หรือ test |
| Focused tests | รัน test ของ owner ที่ถูกแก้; บันทึกจำนวน test ที่รันจริง |
| Full tests/build | รันเมื่อ scope กระทบหลาย owner หรือ client/server bundle และบันทึก warnings ตามจริง |
| External handoff | push branch แยกและเปิด PR ให้ AI-0 review; ห้าม push เข้า `main` |
| Status semantics | worker ขอ `WAITING_EVIDENCE` จนกว่า AI-0 ตรวจรับ; ไม่ประกาศ global complete จาก branch ของ worker |

## Scope and limitations

O-05 checkpoint นี้เป็น **process evidence** ไม่ใช่การเปลี่ยนสถานะ requirement ใน matrix และไม่ใช่การอนุมัติ merge ของ PR ก่อนหน้า. หลักฐานนี้แสดง isolated branch/commit/PR discipline ของ AI-3 จากงานที่ทำจริง แต่ไม่แทนการ review ของ AI-0 และไม่พิสูจน์ mobile/device, authenticated, production, live database หรือ full global acceptance.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `O-05` |
| Requirement | `O-05` |
| Owner | AI-3 |
| Branch | `ai3/o05-checkpoint-workflow` |
| Commit SHA | `3596ce3b3baa0edf691e6fc29224b999a42c43e4` |
| Files changed | `docs/evidence/ai3-o05-checkpoint-workflow.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; scope ไม่มี code runtime change |
| Result | บันทึก workflow ที่ทำทีละ checkpoint, ใช้ exact reservation, แยก branch/commit/PR และส่ง evidence ให้ AI-0 ตรวจ |
| Blockers/limitations | AI-0 ยังต้อง review/merge และอัปเดต registry/matrix; report นี้ไม่เปลี่ยนสถานะ requirement |
| Merge request | PR จะใช้ชื่อ `[AI-3][O-05]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และหลักฐาน |
