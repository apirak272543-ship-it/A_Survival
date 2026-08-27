# AI-3 V-03 Asset Pack Boundary

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `V-03` |
| Requirement | runtime asset แยกเป็น replaceable mod/texture pack |
| Owner | AI-3 |
| Branch/worktree | `ai3/v03-asset-pack-boundary` / `/home/ubuntu/A_Survival-v03` |
| Base SHA | `2998e3478480a6187916cf86bb00af0f741acda2` |
| Files reserved | `client/src/game/assets/assetPackLoader.ts`, `server/assetPackManifest.test.ts`, `docs/evidence/ai3-v03-asset-pack-boundary.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

เพิ่ม fail-closed validation ใน `isAssetPackManifest` ให้ runtime ใช้ manifest ที่มี contract ครบถ้วนเท่านั้น โดยไม่สร้างหรือแก้ไขไฟล์ binary ใด ๆ. Validator บังคับ schema version ที่รองรับ, metadata สำคัญแบบ non-empty, logical resolution และ tile size ที่เป็นจำนวนเต็มบวก, dependencies ที่เป็น string ไม่ว่าง, base path ที่เป็น absolute path ปลอดภัย, pack-level SHA-256 และ entry-level SHA-256 ทุก entry. นอกจากนี้ fallback ของแต่ละ entry ต้องชี้ไปยัง asset ID ที่มีอยู่จริงใน manifest และ manifest ต้องมี entry อย่างน้อยหนึ่งรายการ.

การเปลี่ยนแปลงนี้ทำให้ manifest ที่ไม่มี digest, ใช้ schema ไม่รองรับ, มี fallback ที่หายไป หรือมี base path traversal ถูกปฏิเสธก่อน `loadAssetPackManifest` จะ cache หรือก่อน provenance graph จะรับไปใช้. Contract เดิมของ `prepareAssetPack` ที่ตรวจ digest ของ response จริงยังคงทำงานต่อ และไม่มีการเพิ่ม generator call, runtime asset generation, player control หรือ map-policy change.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `git diff --check` | ผ่านหลังแก้ไข |
| `pnpm check` | ผ่านหลังแก้ type narrowing รอบสุดท้าย |
| Full test command | `pnpm test -- --run` ผ่าน; `118` test files / `490` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| Focused command | `pnpm test -- server/assetPackManifest.test.ts` |
| Focused result | Vitest ผ่าน; เนื่องจาก project config รวม suite, ผลที่รันจริงคือ `118` test files และ `490` tests ผ่าน |
| Added assertions | schema version, required metadata, pack SHA, entry SHA, fallback target และ base-path traversal |
| Binary assets | ไม่ได้สร้าง แก้ไข หรือนำเข้า |
| Runtime write | ไม่เพิ่ม cache/IndexedDB write; loader behavior เดิมคงอยู่และ manifest ที่ invalid จะไม่ถูก cache |
| Player-visible effect | ไม่มีการแก้ player UI หรือ gameplay behavior โดยตรง |
| Device/mobile acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

การตรวจนี้ยืนยันเฉพาะ manifest/loader boundary และ reference integrity จาก source ที่มีอยู่ ไม่ได้พิสูจน์ว่าไฟล์ asset ทุกชนิดมี license ที่อนุมัติแล้ว, ไม่ได้เพิ่ม cryptographic verification ของ `packSha256` เทียบกับ ordered entry digestsใน browser, และไม่ได้ทำ runtime publish/import ใหม่. การตรวจว่ารหัส SHA ของไฟล์ใน active pack ตรงกับ bytes ยังคงอยู่ใน `server/assetPackManifest.test.ts`; AI-0 ควรรัน full build และ review diff ก่อนรับงาน.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `V-03` |
| Requirement | `V-03` |
| Owner | AI-3 |
| Branch | `ai3/v03-asset-pack-boundary` |
| Commit SHA | `86ef193c58297dff917e318499b93dc065ca2b33` |
| Files changed | `client/src/game/assets/assetPackLoader.ts`, `server/assetPackManifest.test.ts`, `docs/evidence/ai3-v03-asset-pack-boundary.md` |
| Checks | `git diff --check`; `pnpm check`; `pnpm test -- server/assetPackManifest.test.ts` ผ่านตามผลที่ระบุด้านบน |
| Result | runtime manifest boundary บังคับ metadata, pack/entry SHA, safe paths และ fallback references แบบ deterministic/fail-closed |
| Blockers/limitations | ยังไม่มี browser/device acceptance, license approval หรือ pack-level SHA recomputation ใน browser; ต้อง review โดย AI-0 |
| Merge request | จะระบุหลัง push; PR จะใช้ชื่อ `[AI-3][V-03]` |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff, test และ build |
