# Phase 5 browser proof notes

## 2026-08-26 — first chest integration smoke test

Navigated to `http://localhost:3000/?route=game&map=map-002-ashen-obsidian-plains` after adding the world-storage module, chest mesh, GameCanvas bridge, ChestSheet, persistence field, and sync validators. The browser viewport remained blank after the initial load and one wait. No chest interaction or runtime-scope claim is counted yet. The next step is to inspect the active dev server/console and fix the startup issue before any chest proof.

## 2026-08-26 — runtime recovered

After restarting the dev server, the direct future-map URL loaded the Obsidian Frontier runtime. The HUD rendered and showed the existing four quick slots, including Aether Foundation and Aether Pickaxe. The first blank page was a stopped dev-server process, not counted as a frontend chest failure. No chest open/transfer claim is counted until the in-world interaction is exercised.

A direct movement control event reached the scene after a corrected console expression and was scheduled to stop after 650ms. The first console expression was syntactically invalid and is not evidence. Chest opening remains unclaimed until the overlay is visibly present.

## 2026-08-26 — chest open and deposit

After moving toward the deterministic chest at the start area and pressing `E`, the UI opened a map-local storage dialog showing `CHEST SLOTS 0/27` and `CARRY SLOTS 9/40`. Clicking the carry transfer control moved `Aether Blade 001` into chest slot 1; the UI then showed `1/27` and `8/40`, while the blade disappeared from carry. The existing development sync/integrity relay displayed an attention overlay because no authenticated session cookie was present; this did not prevent the local transfer. The chest item was selected for the following withdraw proof.

## 2026-08-26 — withdraw and reload

Selecting the stored blade and clicking `นำของออก` cleared chest slot 1 and restored the carry count to `9/40`; the blade was visible again in carry. Reloading the same direct future-map URL returned to the Obsidian runtime with the blade still in carry, confirming the transfer state was not lost during route reload. The chest was empty after the round-trip. The integrity relay attention overlay remained a known unauthenticated-dev limitation, not a storage-rule failure.

After a second reload, movement plus `E` reopened the same Obsidian chest. It still showed `0/27` and `9/40`, confirming the previous withdraw state was rehydrated rather than an in-memory overlay artifact. This is the clean starting point for a deposit-then-reload persistence check.

## 2026-08-26 — deposit persistence

With the chest reopened after the earlier round-trip, the selected carry item was `Aether Pickaxe 001`. Depositing it changed the UI to `CHEST SLOTS 1/27` and `CARRY SLOTS 8/40`, with the pickaxe in chest slot 1 and absent from carry. Reloading the same direct route returned to the Obsidian scene; the following chest-open check is required to claim the persisted slot visually.

## 2026-08-26 — visually confirmed persisted chest slot

After the deposit-then-reload cycle, movement plus `E` reopened the chest and visibly showed `Aether Pickaxe 001 ×1` in chest slot 1, `CHEST SLOTS 1/27`, and `CARRY SLOTS 8/40`. This is the browser persistence proof for the current static Obsidian chest. The runtime remained Obsidian despite the future-map query string.
