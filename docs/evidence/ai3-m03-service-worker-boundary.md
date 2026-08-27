# AI-3 M-03 Service Worker Boundary

## TASK CLAIM

| รายการ | ค่า |
|---|---|
| Task ID | `M-03` |
| Requirement | offline-first cache/integrity เล่นต่อเมื่อ network หาย |
| Owner | AI-3 |
| Branch/worktree | `ai3/m03-service-worker-boundary` / `/home/ubuntu/A_Survival-m03` |
| Base SHA | `6ef111c461dfde7d83f2cb2fbe89ea24c29049d4` |
| Files reserved | `client/public/sw.js`, `server/serviceWorkerBoundary.test.ts`, `docs/evidence/ai3-m03-service-worker-boundary.md` |
| Status | `AVAILABLE -> RESERVED -> IN_PROGRESS` |
| Forbidden scope acknowledged | yes |

## Implementation checkpoint

Service worker เดิม route ทุก path ใต้ `/offline-map-modules/` เข้า cache-first โดยไม่ได้ตรวจว่า map นั้นเป็น runtime-approved หรือไม่. Checkpoint นี้เพิ่ม allow-list แบบ fail-closed ที่มีเพียง `obsidian-frontier` และ matcher ที่ยอมรับเฉพาะรูปแบบ `/offline-map-modules/<mapId>.json` ที่เป็น path ตรงระดับเดียวกัน. Future map, nested path และ path ที่ decode ไม่ได้จะไม่ถูกส่งเข้า `respondWith` และจึงไม่ถูก cache หรือ fetch ผ่าน map-module handler.

การเปลี่ยนแปลงไม่แตะ `directRoute.ts`, `maps.ts`, `mapCache.ts` หรือ IndexedDB และไม่ได้เปิด player map selection. ชื่อ cache เดิม `arcane-frontier-static-v2`, `arcane-frontier-map-modules-v3`, `arcane-frontier-assets-v2` และ `arcane-frontier-runtime-v2` ถูกคงไว้. ส่วนการเปิด map ใน client ยังคงอยู่ภายใต้ guard เดิมของ `mapCache.ts`; service worker patch นี้เป็น defense-in-depth boundary ของ request path.

## Test evidence

| ตรวจสอบ | ผล |
|---|---|
| `node --check client/public/sw.js` | ผ่าน |
| `git diff --check` | ผ่าน |
| `pnpm check` | ผ่าน |
| Full test command | `pnpm test -- --run` ผ่าน; `121` test files / `502` tests |
| Production build | `NODE_OPTIONS=--max-old-space-size=1536 pnpm build` ผ่าน |
| Build warnings | analytics env placeholders ไม่ได้กำหนด, analytics script ไม่มี `type="module"`, และมี Babylon/vendor chunk ขนาดใหญ่กว่า 1000 kB |
| Focused command | `pnpm exec vitest run server/serviceWorkerBoundary.test.ts --reporter=verbose` |
| Focused result | `1` test file / `2` tests ผ่าน |
| Active map behavior | `/offline-map-modules/obsidian-frontier.json` ถูก route เข้า cache-first handler |
| Future map behavior | `/offline-map-modules/map-002-ashen-obsidian-plains.json` ไม่ถูก route และไม่ถูก cache/fetch ผ่าน handler |
| Malformed behavior | encoded-invalid และ nested map paths ไม่ถูกถือเป็น runtime-approved |
| Binary assets | ไม่ได้สร้าง แก้ไข หรือนำเข้า |
| Runtime map policy | ไม่มีการเพิ่ม map ID นอก `obsidian-frontier` |
| Device/mobile acceptance | ไม่ได้อ้างและไม่ได้ทดสอบ |

## Limitations

Checkpoint นี้พิสูจน์ service-worker request boundary ด้วย VM harness และ syntax check เท่านั้น ไม่ใช่ browser/offline device acceptance. ไม่ได้เพิ่ม cryptographic digest verification ให้ map payload ใน Cache Storage และไม่ตรวจเนื้อหา cached response หลัง cache hit. การตรวจ persistence, resync, airplane-mode และ map payload integrity ระดับ runtime ยังต้องแยกเป็นงานต่อไปหาก dependency และ owner พร้อม.

## TASK COMPLETE

| รายการ | ค่า |
|---|---|
| Task ID | `M-03` |
| Requirement | `M-03` |
| Owner | AI-3 |
| Branch | `ai3/m03-service-worker-boundary` |
| Commit SHA | `a4baa37f4f83cdd9e2f7f3943f71b8aaff0642fc` |
| Files changed | `client/public/sw.js`, `server/serviceWorkerBoundary.test.ts`, `docs/evidence/ai3-m03-service-worker-boundary.md` |
| Checks | `node --check`, `git diff --check`, `pnpm check`, focused test, full `121` files / `502` tests และ heap-limited build ผ่าน |
| Result | service worker cache-first map route ถูกจำกัดไว้ที่ runtime-approved `obsidian-frontier` แบบ fail-closed |
| Blockers/limitations | ไม่มี real-device/WebView acceptance และยังไม่มี cached payload digest verification |
| Merge request | PR จะใช้ชื่อ `[AI-3][M-03]` หลัง push |
| Status requested | `WAITING_EVIDENCE` จนกว่า AI-0 จะตรวจ branch, diff, tests และ build |
