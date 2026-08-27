# AI-3 L-01 Thai Copy Audit

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `L-01` |
| Requirement | Thai default colloquial copy, no over-formal wording |
| Owner | AI-3 |
| Branch/worktree | `ai3/l01-thai-copy-audit` / `/home/ubuntu/A_Survival-l01` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-l01-thai-copy-audit.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Audit scope and findings

ตรวจ source copy ใน `client/src` โดยเน้นหน้าผู้เล่น, settings, Vault/Codex, home และ Creator pages. ใช้ `git grep` ค้น Thai characters และคำ formal/policy ที่มักทำให้ tone แข็งเกินไป พร้อมอ่านตัวอย่าง user-facing labels ใน `ArcaneFrontier.tsx`. Checkpoint นี้เป็น audit-only จึงไม่เปลี่ยน copy หรือ component ที่เป็น owner ของ AI-0.

| พื้นที่ | หลักฐานที่พบ | สถานะ audit |
|---|---|---|
| Main player/lobby | มี label ไทยเช่น `คู่มือ`, `เครดิต`, `ตั้งค่า`, `กลับโถง`, `พื้นที่ส่วนตัว` และคำอธิบายการเล่น/การย้ายของ | สอดคล้องกับ Thai-default ในหลายจุด |
| Vault/chest | มีข้อความไทยสำหรับ `นำของออก`, `เก็บเข้าหีบ`, ของเต็มไม่ทำให้หาย และ provenance; มี technical labels `CHEST SLOTS`, `CARRY SLOTS` | ควร review ความสม่ำเสมอของ label ไทยกับ English technical token |
| Brand/proper nouns | `ARCANE FRONTIER`, `Aether Homestead`, `Tactical`, `Builder`, `Over-shoulder`, ชื่อ biome/item และ asset IDs ถูกใช้เป็น proper noun หรือ product token | ไม่ควรแปลอัตโนมัติโดยไม่ review product language |
| Settings/camera | มี Thai purpose/description ใน camera options และมี technical values เช่น FPS, WebGL, LOD, touch | ควรคงคำเทคนิคที่จำเป็น แต่ต้องมีคำอธิบายภาษาไทยแบบ colloquial |
| Creator pages | ควรคง Thai-first copy และหลีกเลี่ยงการนำ internal generator terms ไปแสดงเป็นคำสั่งผู้เล่นโดยตรง | ต้อง screen-by-screen review โดย AI-0 |
| Formal/policy candidates | `git grep` พบคำ system/policy/error จำนวนมากที่อาจเป็น status copy ไม่ใช่ prose ผู้เล่น | ต้องจัดกลุ่มตาม context ก่อนแก้ ไม่ใช่แทนที่คำทั้งหมดแบบ mechanical |

## Copy policy recorded

Thai เป็น default สำหรับคำอธิบาย ปุ่ม คำเตือน และ feedback ของผู้เล่น. ใช้ภาษากระชับ เป็นธรรมชาติ และบอกผลของ action โดยตรง. English ใช้ได้เมื่อเป็น brand/proper noun, technical token ที่ผู้เล่นคุ้นเคย หรือมี Thai explanation กำกับ. หลีกเลี่ยงสำนวนราชการและคำขึ้นต้นแบบพิธีการเมื่อไม่จำเป็น; ห้ามเปลี่ยนข้อความ safety/rating ให้กำกวมเพื่อให้ดูเป็นกันเอง.

การ audit นี้ไม่แปลชื่อ product, biome, item, asset ID, API term หรือ diagnostic code โดยอัตโนมัติ และไม่ถือว่าข้อความที่อยู่ใน server log/test เป็น player-facing copy. การแก้จริงควรใช้ owner component, screenshot/browser review และ regression ของทุก entry route.

## Validation evidence

| Gate | ผล |
|---|---|
| Source-of-truth | ตรวจจาก `origin/main` SHA `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` และ source ภายใต้ `client/src` |
| Search | `git grep` สำหรับ Thai characters และ formal/status candidates ใน `client/src/pages` และ `client/src/game` |
| Sample review | ตรวจ main player/lobby, chest/Vault, settings/camera, brand/proper nouns และ Creator page boundary |
| Runtime change | ไม่มี code, UI, network/cache/IndexedDB/database หรือ persistence change |
| Binary assets | ไม่ได้สร้าง แก้ไข หรือนำเข้า |
| `git diff --check` | ต้องรันก่อน commit |
| `pnpm check` | ต้องรันก่อน commit; docs-only checkpoint |

## Limitations and blockers

L-01 เป็น requirement กว้างและ owner หลักเป็น AI-0. รายงานนี้เป็น audit sample ไม่ใช่การรับรองทุกข้อความในทุก route และไม่ใช่การรับรองว่าไม่มี formal copy เหลืออยู่. ต้องมี screen-by-screen review, copy decision list และ browser evidence ก่อนเปลี่ยนเป็น `VERIFIED`. Creator tools, rating/safety copy, voice/dialogue และ localization completeness ยังอยู่นอก checkpoint นี้.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `L-01` |
| Requirement | `L-01` |
| Owner | AI-3 |
| Branch | `ai3/l01-thai-copy-audit` |
| Commit SHA | `251c0cbc49a300a7971ceea8fd5566e054cbe24c` |
| Files changed | `docs/evidence/ai3-l01-thai-copy-audit.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | บันทึก Thai-first copy policy, proper-noun boundary และ sample review findings |
| Blockers/limitations | ยังไม่มี full screen-by-screen browser review หรือการแก้ copy จริง; ต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][L-01]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ audit scope |
