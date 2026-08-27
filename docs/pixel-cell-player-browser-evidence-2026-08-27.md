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

## Layer-aware regression check

After restarting the local dev server with the layer-aware contract, the player landing again rendered the normal `Arcane Frontier` surface only. The DOM exposed player controls (คู่มือ, เครดิต, ตั้งค่า, เข้าสู่พื้นที่รอยต่อ) and did not expose layer selector, pixel grid, texture Builder, composition, registry, review, or creator controls. This is a fresh player boundary check, not authenticated creator preview evidence.

## Shared catalog regression check

After wiring the shared creator template catalog into CreatorStudio and CreatorDomainWorkbench, a fresh player landing check again rendered only the normal `Arcane Frontier` player surface. DOM-visible controls remained คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ; no template catalog, skin parts, layer selector, pixel grid, texture Builder, registry, review or creator controls appeared. This is player boundary evidence only; no authenticated creator preview claim is made.

## Template-driven selection regression check

After adding shared-catalog template selection, kind-to-subject mapping, 32×32 Workbench filtering, and draft reset behavior, a fresh player landing check still showed only the normal player surface: คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ. No template catalog, creator subject selector, pixel grid, layer control, texture preview, registry or review control appeared. This remains player boundary evidence only; no authenticated creator preview claim is made.

## Texture export preview boundary check

After adding `creator.composition.exportPreview` and the explicit `ดาวน์โหลด PNG preview` action, a fresh player landing check still rendered only the normal player surface: คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ. No texture export, PNG download, template, pixel, registry, review or creator control appeared. This is player boundary evidence only; the sandbox has no authenticated creator session, so no admin export execution or download claim is made.

## Animation-to-skin texture boundary check

After the composition texture adapter was extended so animation subjects produce a validated `skin` texture and parts-derived `skinLayout`, a fresh player landing check still showed only the normal player surface. No skin layout, texture export, PNG download, composition, registry, review or creator controls appeared. This remains a player boundary check; no authenticated creator preview, skin export execution or device acceptance is claimed.

## Manifest sidecar export boundary check

After adding the deterministic `manifest.json` sidecar and explicit manifest download button to the creator export result, a fresh player landing check still displayed only normal player controls. No manifest, PNG download, texture, skin, composition, registry, review or creator controls appeared. This is player boundary evidence only; no authenticated creator export/download execution is claimed.

## ZIP texture-pack bundle boundary check

After adding deterministic ZIP assembly and the manual `ดาวน์โหลด ZIP texture pack` action, a fresh player landing check still showed only the normal player surface. No ZIP, manifest, PNG download, texture, skin, composition, registry, review or creator controls appeared. This is player boundary evidence only; no authenticated creator package download execution is claimed.

## Final ZIP bundle boundary check

After the archive size/path guards and final ZIP download UI were added, a fresh player landing check still displayed only the normal player surface. No ZIP, manifest, PNG download, texture, skin, composition, registry, review or creator controls appeared. This remains player boundary evidence only; no authenticated creator package download execution is claimed.
