# Pixel-cell checkpoint browser evidence — 2026-08-27

## Player boundary

Local dev server was opened at `http://localhost:3000/`. The rendered player landing was `Arcane Frontier` with only player-facing controls such as คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ. The page had no `composition`, `pixel`, `layer`, `palette`, `creator`, or `workbench` text. This verifies the new editor is not exposed in the player landing route.

## Scope

This is a player boundary smoke check only. It is not authenticated admin preview evidence, does not prove database registration, and does not prove texture/model export or runtime publishing.

## Validation context

At the time of this evidence, the pixel-cell builder focused tests, `pnpm check`, full test suite, and production build had passed. The checkpoint remains `PARTIAL` because the UI editor is bounded to 32 × 32 display, while later texture atlas, model/skeleton bytes, durable DB E2E, asset compatibility, and runtime publish work remain outstanding.

## Creator access boundary

Opening `http://localhost:3000/creator-workbench` without an authenticated admin session rendered only the Thai `DEVELOPER ONLY` gate and `กลับหน้าผู้เล่น`. The composition card, pixel grid, palette controls, and preview action were not rendered. This confirms the route-level protection but is explicitly **not** authenticated admin E2E evidence; no login or authorization state was fabricated for this check.

## Handoff regression boundary

After adding `creator.composition.texturePreview`, the player landing was reloaded and still rendered only the `Arcane Frontier` player surface with คู่มือ, เครดิต, ตั้งค่า and the game entry action. No texture builder, PNG, composition, pixel, palette, registry, review or creator controls appeared. This remains a boundary smoke check; it does not replace authenticated admin preview evidence.
