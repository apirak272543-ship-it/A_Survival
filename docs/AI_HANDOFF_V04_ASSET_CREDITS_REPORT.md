# V-04 — รายงาน Asset Credit และ Runtime/Reference-only Boundary

## TASK COMPLETE

ดำเนินงาน checkpoint แบบ bounded ของข้อกำหนด `V-04` ใน repository `apirak272543-ship-it/A_Survival` โดยเสริม canonical asset provenance owner ให้มี pure audit สำหรับ license, attribution, source evidence และ runtime eligibility. งานนี้แยกชัดเจนระหว่าง asset ที่ distributable กับข้อมูลอ้างอิง และไม่อ้างว่า Credits UI/contact workflow หรือ runtime publish/import เสร็จสมบูรณ์

> Implementation ยังไม่ merge เข้า `main`. AI-0 เป็นผู้ตรวจ diff, merge และอัปเดตสถานะ registry หลังตรวจหลักฐานด้วยตนเอง

## Owner / สิ่งที่ตรวจ / ผล / blocker / test evidence

| Owner | สิ่งที่ตรวจ | ผล | blocker | test evidence |
|---|---|---|---|---|
| `client/src/game/data/assetProvenance.ts` | `AssetCredit`, status taxonomy, `ASSET_CREDITS`, `getAssetCredit`, `canDistributeAsset` | เพิ่ม `validateAssetCredit` และ `auditAssetCredits` แบบ deterministic/read-only พร้อม fingerprint, per-record status และ summary | duplicate ID, malformed ID/category/status, missing attribution/creator/title/license/source, invalid URL, `awaiting-contact` และ `reference-only` เป็น blockers หรือ non-runtime states ตามหลักฐาน | `server/assetCreditsRuntimeBoundary.test.ts` ผ่าน 5 tests |
| canonical `ASSET_CREDITS` | starter pack และ external/community references | พบ 3 records: project-original 1 รายการที่ distributable/runtime-eligible และ reference-only 2 รายการที่ไม่ distributable | reference-only records ถูกติด `reference-only-runtime`; ไม่ถูกนับเป็น runtime asset และไม่ถูกเปลี่ยนสถานะด้วยการเดา | test ตรวจ counts, records และ fingerprint |
| status boundary | project-original, license-verified, awaiting-contact, reference-only | project-original/license-verified ผ่าน simple distribution gate เมื่อหลักฐานครบ; awaiting-contact/reference-only ไม่ผ่าน | awaiting-contact ต้องรอ contact/license evidence; reference-only ใช้เป็น research/reference เท่านั้น | test ตรวจ status gate และ missing evidence |
| source contract | source URL/label, license และ attribution | non-original record ต้องมี HTTP(S) source URL, source label, license และ attribution | ไม่มี source หรือ URL ผิดรูปแบบจะเป็น required blocker; ไม่อ้าง unknown license เป็น runtime | test จำลอง malformed URL และ missing evidence |

## Files changed

| ไฟล์ | การเปลี่ยนแปลง |
|---|---|
| `client/src/game/data/assetProvenance.ts` | เพิ่ม pure V-04 credit validation/audit contract, deterministic content fingerprint, issue taxonomy และ runtime/reference-only summary โดยคง canonical records เดิม |
| `server/assetCreditsRuntimeBoundary.test.ts` | เพิ่ม regression tests 5 รายการสำหรับ canonical credits, verified/awaiting/reference-only states, malformed/duplicate records, immutability, deterministic fingerprint และ bounds |
| `docs/AI_HANDOFF_V04_ASSET_CREDITS_REPORT.md` | รายงานภาษาไทยของ checkpoint; ไม่แก้ registry หรือ owner matrix |

ไม่มีการแก้ Credits UI/player UI, Workbench, router, manifest/binary assets, asset loader, runtime import/cache, database/schema/migration, IndexedDB/offline state, authority/auth, quest reward, map policy หรือ runtime render loop. ไม่มีการสร้าง PNG/GLB/texture/skin และไม่มีการนำ Minecraft/RoV code, asset หรือ branding มาใช้

## Branch, reservation และ Git evidence

| รายการ | หลักฐาน |
|---|---|
| Task ID | `V-04` |
| Requirement | external/community asset มี license/provenance/เครดิต |
| Owner | `AI-2` |
| Branch/worktree | `ai-2/asset-credits-v04` / `/home/ubuntu/A_Survival_ai2` |
| Base SHA ที่ checkout จริง | `1856600529d4eafb4e432989fea7606d66e4ef78` (`origin/main`) |
| Files reserved | `client/src/game/data/assetProvenance.ts`, `server/assetCreditsRuntimeBoundary.test.ts`, `docs/AI_HANDOFF_V04_ASSET_CREDITS_REPORT.md` |
| Implementation commit | `0a93e30bd346499e24ed7bd547ef62a9882f4dd9` (`0a93e30`) |
| Remote branch | `origin/ai-2/asset-credits-v04` ถูก push แล้ว |
| Registry/matrix changes | ไม่แก้ `docs/AI_COORDINATION_REGISTRY.md` และ `docs/OWNER_REQUIREMENTS_MATRIX.md`; AI-0 เป็น owner ของทั้งสองไฟล์ |
| Recovery refs/stash | ไม่แตะต้อง; ไม่มี reset, revert, force checkout, force push, recovery-ref deletion หรือ stash manipulation |

## Validation evidence

| Check | ผลที่รันจริง |
|---|---|
| Focused V-04 suite | ผ่าน `1` test file / `5` tests |
| Full test suite | ผ่าน `109` test files / `433` tests ด้วย `pnpm test -- --run` |
| TypeScript | ผ่าน `pnpm check` |
| Whitespace/error check | ผ่าน `git diff --check` |
| Production build | ผ่าน `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ทั้ง Vite client และ esbuild server bundle |

Build warnings ที่ตรวจพบจริงและไม่ได้แก้ใน checkpoint นี้ ได้แก่ `VITE_ANALYTICS_ENDPOINT` และ `VITE_ANALYTICS_WEBSITE_ID` ไม่ได้กำหนด, analytics script ใน `index.html` ไม่มี `type="module"`, Babylon vendor chunk มีขนาดเกิน 1 MB และ pnpm แจ้งว่า field `pnpm` ใน `package.json` ถูก ignore โดย pnpm รุ่นที่กำลังใช้. ไม่มี warning ใดอยู่ในขอบเขต asset credit audit

## Result และ blockers/limitations

ผลที่พิสูจน์ได้คือ canonical `ASSET_CREDITS` มี project-original starter pack 1 รายการที่ผ่าน distribution/runtime eligibility และมี reference-only community/reference records 2 รายการที่ถูก block จาก runtime อย่างชัดเจน. Audit ตรวจ duplicate/malformed records, required attribution/license/source evidence, status taxonomy, immutability และ deterministic fingerprint ได้โดยไม่ mutate source และไม่ fabricate provenance

Checkpoint นี้ยังไม่ทำให้ V-04 เป็น `VERIFIED` ทั้งข้อ. ยังไม่มี Credits/Supporters navigation UI, contact workflow, durable registry snapshot, active manifest-to-credit acceptance สำหรับทุก runtime entry, authenticated creator E2E, storage/database evidence, runtime publish/import/cache acceptance หรือ browser/device/mobile evidence. Graphical assets ที่ไม่มี license/provenance ชัดเจนยังต้องเป็น reference-only/blocked ตาม policy

AI-0 ควรตรวจ diff ของ commit `0a93e30`, ตรวจ completion report นี้ และเปลี่ยนสถานะ task ตามหลักฐานจริง. หากต้องเพิ่ม Credits UI/contact workflow ให้เปิด checkpoint และ reservation ใหม่ ไม่ควรขยาย scope แอบแฝงไปยังไฟล์ player UI หรือ Workbench
