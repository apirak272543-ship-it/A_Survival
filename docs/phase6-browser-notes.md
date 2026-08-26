# Phase 6 browser proof (in progress)

- Visited `http://localhost:3000/?route=game&map=map-002-ashen-obsidian-plains` on the local dev server.
- Runtime resolved to **Obsidian Frontier** rather than exposing the future map, confirming the existing Obsidian-only direct-route guard remains active after camera work.
- After the loading gate, the page rendered a Babylon canvas, game HUD, inventory controls, and the in-map settings button (`เปิดตั้งค่า`).
- This is only a startup/fallback proof so far. Camera mode switching, persistence after reload, and visual verification of first-person/overhead/side remain pending in this checkpoint.
- Dev/auth caveat remains unchanged: no authenticated user cookie is evidence of the game runtime itself; do not interpret sync/integrity attention as a gameplay failure.

## Visual observation

The current default view is a readable elevated/overhead 3D field with the Obsidian palette, blocks, resources, companion/hostile scene elements, and touch controls. No future map selector was exposed by the direct URL.

## Next browser checks

1. Open the in-map settings sheet.
2. Select first-person, overhead, and side modes and capture the visible state for each.
3. Change view distance and target FPS, reload, and verify the values are hydrated.
4. Revisit the direct future-map URL after reload and confirm it still resolves to Obsidian.

## In-map settings interaction proof

- Opened the in-map settings sheet from the game HUD. The sheet is titled `ตั้งค่าภายในแผนที่` and contains separate controls for camera mode, view distance, and target FPS.
- The browser exposed all three camera choices with Thai descriptions: `บุคคลที่ 1`, `มุมสูง`, and `มุมด้านข้าง`.
- Selected `บุคคลที่ 1`; the rendered scene changed from the elevated field view to a low, near-player view while the Babylon canvas remained mounted.
- Selected `50 บล็อก`; the sheet displayed `ระยะมองเห็น 50 บล็อก`, confirming the maximum option is available in steps of 5.
- The sheet explicitly labels FPS as a target and not a guarantee. The browser viewport list truncates the select options visually at 60 FPS, but the extracted page content includes the 120 FPS option.
- A red runtime toast appeared during interaction; this was not treated as a camera failure because the scene and settings state remained rendered. It should be investigated only if repeated as a reproducible save/integrity error.

## Side camera visual proof

After selecting `มุมด้านข้าง` and closing the sheet, the canvas remained mounted and showed a substantially lower, horizon-oriented view across the Obsidian terrain. This is distinct from the default elevated overhead framing and provides browser evidence that the third camera mode is wired to the runtime, not merely displayed as a UI option.

## Overhead camera visual proof

The native browser select action returned a Chromium UTF-8 marshalling error while choosing the Thai-labeled option. The same UI was changed through a controlled DOM `change` event to the value `overhead`; the console reported three selects and `value: overhead`. After closing the sheet, the scene returned to the elevated overhead framing with a wide readable field, confirming the second camera mode is active.

This browser limitation is specific to the automation response encoding; it does not indicate an application error. The UI path remains available to users through the native select.

## Reload proof (visual stage)

Reloaded the same future-map URL. The runtime again resolved to Obsidian Frontier and restored the elevated overhead framing without exposing a future map. The canvas and HUD returned successfully; the settings sheet still needs to be opened after this reload to record the persisted select values directly.

## IndexedDB hydration proof

After the reload, the in-map settings sheet was opened and the selected values were read from the live controls. The values were `cameraMode: overhead` (label `มุมสูง`), `viewDistanceBlocks: 50` (label `50 บล็อก`), and `targetFps: 60` (label `60 FPS · เป้าหมาย ไม่ใช่การรับประกัน`). This confirms persistence and hydration for the tested map/player session. The 120 FPS option is present in the UI contract but was not selected in this browser proof.

## Outside-game navigation observation

The landing page does not expose the in-map camera controls. Entering the frontier moves to the identity screen first, which is consistent with keeping camera settings inside gameplay. A global settings control was not yet visible on the landing/identity viewport; the outside-game settings surface remains to be located in the next browser check before finalizing the split claim.

## Global settings split proof

Entered the outside-game lobby with a temporary local proof profile and opened the header settings control. The sheet is labeled `GLOBAL SETTINGS · APP-WIDE` / `ตั้งค่าตัวเกมภาพรวม` and exposes only global render preset, graphics quality, effect density, music, sound effects, touch size/opacity, and reduced motion. It does not expose camera mode, block view distance, or target FPS. The sheet copy explicitly directs players to use the in-map sheet for those controls.

The temporary profile was used only for local browser verification and is not production or user identity evidence.
