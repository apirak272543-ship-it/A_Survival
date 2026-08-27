# World → block → content-catalog browser boundary evidence — 2026-08-27

- A temporary local dev server was started from the current repository for boundary smoke only.
- The first navigation to `/` briefly showed a blank loading frame while the dev server initialized. A follow-up page view loaded the player landing successfully.
- The loaded player landing showed `ARCANE FRONTIER`, Thai player-facing navigation (`คู่มือ`, `เครดิต`, `ตั้งค่า`), the survival CTA `เข้าสู่พื้นที่รอยต่อ`, and the Obsidian Frontier label. No world-block graph selector, block sample count, catalog, generator, registry, seed/rules, or admin controls were visible.
- The blank first frame is recorded as startup timing, not counted as a successful player render; the follow-up view is the usable boundary observation.
- The unauthenticated Workbench route still needs its separate smoke observation below.

This file must be completed with the `/creator-workbench` observation before checkpoint close. The browser smoke does not claim authenticated admin E2E, a successful graph mutation, database/storage writes, binary generation, runtime import/cache/publish, or device/mobile acceptance.

## Unauthenticated Workbench observation

A fresh `/creator-workbench` request rendered `DEVELOPER ONLY`, `เข้า Creator Studio ไม่ได้`, and `กรุณาเข้าสู่ระบบผู้ดูแลระบบก่อนใช้งานพื้นที่สร้าง asset`, with only `กลับหน้าผู้เล่น`. The world-block source selector, block sample count, rules field, unresolved-reference cards, and graph preview action were not exposed. This confirms the role boundary only; no authenticated Workbench E2E or database/storage operation was performed.

The temporary dev server must be stopped before commit.
