# Working Memory

## Decisions made

- The application is a browser-first, PWA-ready landscape mobile game that may later be opened inside an APK wrapper.
- Visual direction comes from Gemini's **Ethereal Arcane-Cyber / Bioluminescent High-Fantasy** blueprint: deep void base, luminous cyan, arcane violet, hazard amber and corrupted crimson.
- Camera target is a 45° isometric top-down MOBA view with 50° FOV and mobile safe margins.
- The entry flow is Player ID without password or signup, then Lobby, home world or map selection, followed by an on-demand scene transition.
- The prototype distinguishes the personal home world from expedition worlds and begins with one playable expedition biome.
- Each expedition map is approximately 500 m in radius from its centre. The runtime renders a configurable visible window (Near 64 m, Balanced 96 m, Far 128 m) and keeps a small data/prefetch margin; it never renders the whole map at once.
- Visual/gameplay completion is delivered one map at a time. Obsidian Frontier is the active full slice; the next biome starts only after this map passes tests and visual verification.
- The player can equip any weapon; weapon category determines the trade-offs and status effects rather than a character class.
- Characters, weapons, item art and UI must follow an anime fantasy-sci-fi language, with high-impact VFX and no generic geometric 3D character presentation. Gemini API is responsible for visual and UI design decisions.
- The in-game settings surface must include graphics, effect, audio, reduced-motion, touch-control size/opacity and render-distance preferences so device capability can determine the playable draw budget.
- Players may own multiple items and multiple instances of the same definition. Weapons/equipment do not stack: each instance has quantity one, its own ID, provenance and enhancement record. Anti-cheat must flag impossible stacking/provenance rather than flagging legitimate ownership of multiple instances.

## Security note

An ID-only identity system cannot by itself prevent another person from entering a known ID. Device binding and server-side provenance validation will be built for the prototype, but a production game that protects valuable inventory must add a recovery/ownership mechanism and server-authoritative validation.

## Visual blueprint summary from Gemini

Gemini proposed a holographic map carousel, a centered 3D character Lobby with side drawers, a left virtual stick, right MOBA action cluster, circular minimap and center-bottom quick slots. The art language uses obsidian surfaces, neon ley-line conduits, bioluminescent fog, xenobotanical flora, pulse runes and distorted energy shields.
