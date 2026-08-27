# AI-3 Q-02 Reference and Provenance Audit

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `Q-02` |
| Requirement | reference Minecraft/other games without copying code/assets/branding |
| Owner | AI-3 |
| Branch/worktree | `ai3/q02-reference-provenance-audit` / `/home/ubuntu/A_Survival-q02` |
| Base SHA | `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d` |
| Files reserved | `docs/evidence/ai3-q02-reference-provenance-audit.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Audit scope and findings

การตรวจนี้เป็น repository-only provenance audit ไม่ใช่ legal clearance และไม่สร้างหรือแก้ asset binary. ค้นหา reference terms ใน `client`, `server`, `shared`, `tools` และ `docs` แล้วแยก reference/policy text ออกจาก runtime code และ asset metadata. หลักเกณฑ์ที่ใช้คือ reference ต้องถูกบันทึกเป็นแรงบันดาลใจหรือ policy เท่านั้น; ไม่ควรใช้ source code, binary asset, branding หรือชื่อที่ทำให้ผู้เล่นเข้าใจว่าเป็น official integration ของเกมอื่น.

| แหล่งหลักฐาน | ผลที่ตรวจได้ | ความหมาย |
|---|---|---|
| `client/public/assets/packs/arcane-frontier-voxel-pixel/manifest.json` | active pack `arcane-frontier-voxel-pixel` version `0.3.0`, `39` entries, `designSource=google-gemini-brief`, `artStatus=starter-authored-from-gemini-brief`, pack SHA มีระบุ | metadata ระบุ source brief และ integrity แต่ไม่ใช่ license approval ของ third-party references |
| `client/public/assets/packs/a-survival-content-library-builder-v0-1/provenance.json` | `sourceArtStatus=procedural-starter-authored`, `usage=future-library-only; not imported by playable Obsidian runtime`, input `16`, output SHA มีระบุ | future library ถูกแยกจาก playable runtime และมี provenance hash |
| `docs/content-texture-pack-audit.md` | visual spot-check ระบุ starter-authored PNG ขนาด `32×32`, ไม่มีข้อความ โลโก้ หรือ branding; ยังไม่ใช่ final art coverage ของ definitions ทั้งหมด | เป็น visual evidence บางส่วน ไม่ใช่การรับรอง asset ทุกไฟล์ |
| Reference search | พบชื่อ/คำอ้างอิงใน policy, audit, research และ source comments บางส่วน จึงต้องถือว่าเป็น reference metadata ที่ต้องคง attribution/boundary | ไม่ควรสรุปว่าไม่มี reference เพียงเพราะ active pack ไม่ใช้ third-party asset |
| Tracked asset inventory | repository มี tracked PNG/GLB และไฟล์ประกอบจริง จึงต้องตรวจ provenance ราย asset/pack แยกจาก reference-text audit | Q-02 ยังไม่ปิดทั้งระบบจากการตรวจเอกสารชุดเดียว |

## Boundary rules recorded

ห้ามคัดลอกโค้ด, binary asset, texture, model, sound, logo, UI trade dress หรือ branding จาก Minecraft, Roblox, RoV หรือเกมอื่น. การพูดถึงเกมเหล่านั้นทำได้เฉพาะในฐานะ reference/inspiration ที่บันทึกไว้ในเอกสารหรือ research note และต้องไม่ถูกตีความเป็นการอนุญาตให้นำ asset/code มาใช้. Active playable runtime ต้องใช้ asset ที่มี provenance และ manifest integrity ของโครงการเอง; future library ต้องคงสถานะ reference/future-only จนกว่าจะผ่าน review ใหม่.

## Validation evidence

| Gate | ผล |
|---|---|
| Source-of-truth | ตรวจจาก `origin/main` SHA `4a41ab74e120a7a41b59dbb3faeb1f9366590d8d`, backlog และไฟล์ provenance จริง |
| Reference search | `git grep` ครอบคลุม `client server shared tools docs` สำหรับ `Minecraft`, `RoV`, `Roblox` |
| Manifest metadata | อ่าน active manifest และตรวจ id/version/source/art status/entry count/pack SHA |
| Future-library boundary | อ่าน `provenance.json` และยืนยัน future-only / not imported by playable Obsidian runtime |
| Binary creation | checkpoint นี้ไม่ได้สร้าง แก้ไข หรือนำเข้า PNG/GLB/เสียง/โมเดล |
| Runtime mutation | ไม่มี code path, network write, cache write, persistence write หรือ creator publish change |
| `git diff --check` | ต้องรันก่อน commit |
| `pnpm check` | ต้องรันก่อน commit; scope เป็น docs-only แต่ repository gate ยังคงใช้ |

## Limitations and blockers

Q-02 ยังมี dependency `V-01` และ `V-04` ตาม backlog. รายงานนี้จึงบันทึก boundary และหลักฐานที่มีอยู่ แต่ไม่ประกาศ license clearance, copyright clearance, trademark clearance หรือ global requirement เป็น `VERIFIED`. การปิดงานเต็มรูปแบบต้องตรวจ provenance ของ binary asset ทุกชุด, source URL/attribution ที่จำเป็น, generated-versus-third-party distinction และ review ของ AI-0 ก่อน merge.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `Q-02` |
| Requirement | `Q-02` |
| Owner | AI-3 |
| Branch | `ai3/q02-reference-provenance-audit` |
| Commit SHA | `4bb3534f556322ae6fd06da391de166f44328214` |
| Files changed | `docs/evidence/ai3-q02-reference-provenance-audit.md` |
| Checks | `git diff --check` และ `pnpm check` ผ่าน; docs-only ไม่เพิ่ม runtime bundle |
| Result | บันทึก reference-only/no-copy boundary และ provenance evidence จาก active/future asset packs |
| Blockers/limitations | dependency V-01/V-04, ไม่มี legal/license clearance ทุก asset และยังต้อง AI-0 review |
| Merge request | PR จะใช้ชื่อ `[AI-3][Q-02]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff และ provenance evidence |
