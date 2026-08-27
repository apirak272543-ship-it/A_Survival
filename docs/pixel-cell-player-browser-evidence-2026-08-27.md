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

## Texture byte compatibility boundary check

After adding the admin-only byte compatibility route/result for manifest, PNG and ZIP verification, a fresh player landing check still displayed only normal player controls. No compatibility result, ZIP/manifest/PNG download, texture, skin, composition, registry, review or creator controls appeared. This is player boundary evidence only; no authenticated creator compatibility execution is claimed.

## Explicit composition registration boundary check

After adding the explicit admin-only composition texture registration action, a fresh player landing check still displayed only normal player controls. No register texture, registry, ZIP/manifest/PNG download, compatibility, texture, skin, composition or creator controls appeared. This is player boundary evidence only; no authenticated registration, object-storage upload or database E2E claim is made.

## Unauthenticated creator-workbench gate check

A fresh visit to `/creator-workbench` without an authenticated session displayed `DEVELOPER ONLY`, stated that Creator Studio access was unavailable, requested an administrator login, and offered only `กลับหน้าผู้เล่น`. The composition register action and Workbench controls were not rendered. This verifies the unauthenticated route gate only; it does not claim an authenticated creator session or durable registration.

## Texture review workflow boundary check

After adding the texture artifact review/list/audit routes and Thai Workbench review controls, a fresh player landing check still displayed only the normal player surface with คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ. No texture review, artifact registry, approve/reject/reopen, audit, composition, register, export or creator controls appeared. This is player boundary evidence only; no authenticated admin review execution, DB migration, storage operation or runtime publish claim is made.

## Multi-part composition boundary check

After adding canonical non-overlapping 32 × 32 body-part presets and the Workbench multi-part selector, a fresh player landing still displayed only the normal player controls: คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ. No part selector, skin layout, composition, review, register, export or creator controls appeared. A fresh unauthenticated visit to `/creator-workbench` displayed only the existing `DEVELOPER ONLY` gate and `กลับหน้าผู้เล่น`; the multi-part editor was not rendered. This is boundary evidence only; no authenticated creator preview, texture export, DB/storage execution or runtime publish claim is made.

## Dependency graph inspector boundary check

After adding the admin-only `creator.dependencyGraph.preview` route and Thai Workbench inspector, a fresh player landing still displayed only คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ. No dependency graph, generator, seed, rules version, registry or creator controls appeared. A fresh unauthenticated visit to `/creator-workbench` displayed only `DEVELOPER ONLY`, the administrator-login gate and `กลับหน้าผู้เล่น`; the graph inspector was not rendered. This is browser boundary evidence only; no authenticated graph preview, registry write, DB/storage execution or player runtime import claim is made.

## Actual content-catalog dependency graph boundary check

After wiring the Workbench dependency inspector to the real deterministic content-catalog generator output, a fresh player landing loaded the normal player surface with คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ only. It did not expose content-catalog, dependency graph, generator, seed, rules version, registry or creator controls. The first navigation briefly showed a blank loading frame; the subsequent page view loaded the normal player surface, so this is not treated as a runtime failure. No authenticated graph preview, catalog generation download, registry write, DB/storage execution or player runtime import claim is made.

## Actual content-catalog unauthenticated gate check

A fresh visit to `/creator-workbench` without an authenticated session remains gated by `DEVELOPER ONLY`, the administrator-login message and `กลับหน้าผู้เล่น`; the actual content-catalog graph controls were not rendered. No authenticated Workbench preview claim is made.

## Browser boundary evidence timestamp

Checked during the current local dev smoke on 2026-08-27. The temporary server was stopped after the smoke; no persistent creator/player server process is part of this evidence.

The follow-up direct navigation to `/creator-workbench` after the actual catalog wiring again showed only the administrator gate and `กลับหน้าผู้เล่น`; no catalog graph preview controls were rendered.

## Quest-to-content dependency graph player boundary check

After adding the admin-only `creator.dependencyGraph.questContentCatalogPreview` route and Workbench source selector, a fresh player landing loaded the normal player surface with คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ only. It did not expose quest graph, content catalog, generator, map-count, seed/rules, registry or creator controls. The first navigation briefly showed a blank loading frame; a follow-up view loaded the normal player surface, so this is not treated as a runtime failure. No authenticated graph preview, database/storage write, future-map runtime import, or player publish/cache claim is made.

A fresh direct visit to `/creator-workbench` after the quest integration showed only `DEVELOPER ONLY`, the administrator-login gate and `กลับหน้าผู้เล่น`; quest graph source, map-count, sample-quest and rules controls were not rendered. This is unauthenticated boundary evidence only and does not claim creator preview execution.

## World-to-structure dependency graph player boundary check

After adding the admin-only `creator.dependencyGraph.worldStructurePreview` route and Workbench source selector, a fresh player landing initially showed a blank loading frame and then loaded the normal player surface on follow-up view. The loaded surface exposed only player controls such as คู่มือ, เครดิต, ตั้งค่า and เข้าสู่พื้นที่รอยต่อ; no world-structure graph, seed/radius, blueprint, generator, registry or creator control was present. This is player-boundary evidence only. No authenticated Workbench execution, structure placement in player runtime, DB/storage write, future-map import/cache or publish claim is made.

A direct unauthenticated visit to `/creator-workbench` after adding the world→structure source returned only the `DEVELOPER ONLY` administrator-login gate and the link back to the player page. No world/structure source selector, radius field, blueprint field or generator action rendered. This does not claim authenticated creator execution.
