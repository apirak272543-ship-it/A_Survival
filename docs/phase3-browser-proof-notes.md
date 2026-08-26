# Phase 3 browser proof notes

- Dev server started at `http://localhost:3000/` with expected local OAuth configuration warning only.
- Direct route `?route=game&map=map-002-ashen-obsidian-plains` hydrated into the game screen, confirming the Obsidian-only route guard still resolves the playable runtime to Obsidian Frontier rather than opening map-002.
- The game HUD rendered four quick-slot controls after the phase-3 wiring. The currently hydrated saved demo profile showed an old inventory state, so slot 4 displayed the legacy material binding instead of the new starter pickaxe; a fresh profile proof is still required.
- Babylon canvas rendered the current Obsidian scene and existing HUD/controls without a startup failure.

- Fresh profile flow opened from the landing page and accepted the temporary test Player ID `BlockProof`; no personal information was used. The form was ready to submit, so starter inventory proof will continue from that profile.

- The fresh `BlockProof` profile created the expected starter inventory. The Obsidian-only map selector showed one playable card, and entering it rendered the Babylon scene.
- Runtime HUD visibly showed four slots: Aether Blade, Aether Berry Seed, Aether Foundation, and Aether Pickaxe. Selecting slot 4 and pressing USE displayed `เลือกเครื่องมือ: pickaxe`, confirming the selected tool reaches the scene.
- The current scene has hostile enemies close to the player, so interaction proof should use a short deterministic keyboard/button sequence and record the resulting toast/inventory state promptly.

- Pressing the interact control opened the existing integrity/sync attention overlay because the local dev environment has no authenticated session cookie and pending offline sync was not accepted. This is not valid evidence of a successful block break by itself; the block state must be checked from local persistence and/or a clean profile.
- The overlay was closed and the scene remained active. No completion claim is made for browser break/place until local state inspection is finished.

## Verified local browser state

The localStorage inspection for `BlockProof` showed a new `structure-001` drop instance with provenance event `block-break-obsidian-frontier-0:0:2`, plus `block-break` actions for the broken slabs and a `block-place` action carrying `{mapId, moduleId, itemInstanceId, itemDefinitionId, coordinate}`. The IndexedDB inspection returned the composite state key `obsidian-frontier` + `BlockProof` and overrides `{ "0:0:2": null, "-1:0:2": null, "1:1:2": "player.placed" }`. This is direct persistence evidence for break/place, although the existing unauthenticated dev environment also raised its normal sync-attention overlay.

- Reloading the direct future-map URL returned to the Obsidian game runtime. After hydration, the Babylon scene rendered again and the placed `player.placed` cube was visible near the player while the previously removed slab cells remained absent. The four-slot HUD persisted, supporting the map-local reload proof.

- After reload, selecting slot 1 and pressing USE displayed `เลือกมือเปล่า`. Pressing E then created a `block-break` action for the remaining slab, while the localStorage inspection still showed only the earlier correct-tool drop instance and no additional `structure-001` drop. This verifies the wrong/generic tool removes the block without returning another block. The normal unauthenticated sync-attention overlay remains a dev-environment concern, not a block-rule failure.
