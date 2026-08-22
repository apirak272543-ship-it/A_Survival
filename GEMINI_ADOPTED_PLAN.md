# Gemini-Adopted Technical Plan

Gemini provided the master plan for Arcane Frontier Survival through the configured fallback chain. This document records the decisions that will drive implementation. The plan is applied as the primary architecture reference together with `GAME_RULES.md`.

## Adopted foundation

The game remains a browser-first landscape experience that later becomes an Android wrapper. The application must boot from a local profile, load its local state without waiting for a network response, and synchronise transactions only in the background. The client will use **IndexedDB** for durable game state and transaction records, while LocalStorage remains limited to small non-critical UI preferences. Cache Storage holds the game shell and map modules; server data validates profile, provenance and synchronisation operations.

| Area | Gemini recommendation adopted | Implementation direction |
| --- | --- | --- |
| Offline storage | Transactional IndexedDB with a queue | Add Dexie-backed profile, inventory, home, farm, map state and queued-action stores. |
| PWA | Cache-first assets, network-first APIs, Background Sync | Upgrade the current service worker to Workbox-style routing and queue sync jobs. |
| Identity | Passwordless Player ID with instant local profile | Keep Player ID only; remove any implication of email/OAuth authentication from the game route. |
| Sync | Optimistic local actions, vector clocks and deterministic merge | Add transaction IDs, device clock and server timestamp fallback to sync payloads. |
| Maps | 1–1.5km JSON module contract, on-demand download | Convert the 100-map registry into validated module records; mark a module offline-ready after caching. |
| UI | Cinematic hub, safe-zone MOBA HUD | Keep the left rail/top resources/central character/bottom modes/right shortcuts and apply safe-area-aware controls. |
| Camera | 3/4 top-down, smoothing and deadzone | Use pitch ~60°, yaw ~45°, camera deadzone and smooth following in the playable scene. |
| Visuals | Soft modern pixel fantasy-sci-fi | Use low-resolution stylisation without blocky pixel art; Gemini provides asset prompts and visual design rules. |

## Game engine decision

Gemini recommends a Phaser 3 and Three.js 2.5D foundation. The current playable prototype uses Babylon.js, so the next engine work must first create an implementation bridge and migration assessment before replacing the running scene. This avoids losing the current playable proof of concept while adopting Gemini's recommended low-resolution 2.5D pipeline. The migration assessment is therefore a required dependency for the map engine milestone.

## Map family plan

The 100-map roadmap uses the distribution below. Each completed map is a separate deliverable and Git commit.

| Map IDs | Family | Count | Core content tone |
| --- | --- | ---: | --- |
| `MAP_001–015` | Obsidian Alien Frontier | 15 | Dark volcanic glass, neon flora, research outposts. |
| `MAP_016–030` | Infernal Ash World | 15 | Ash skies, lava rivers, metallic ruins, fire fauna. |
| `MAP_031–040` | Mars Outpost | 10 | Red dust, terraforming domes, mining rigs, ice caves. |
| `MAP_041–055` | Crystal Desert | 15 | Prismatic dunes, singing crystals, light-bending temples. |
| `MAP_056–070` | Dense Alien Jungle | 15 | Bioluminescent canopy, toxic spores, carnivorous vines. |
| `MAP_071–080` | Rocky Mountains | 10 | Cliffs, floating islands, high-altitude stations. |
| `MAP_081–090` | Forest Highlands | 10 | Mist valleys, ancient runestones, cybernetic wildlife. |
| `MAP_091–100` | Fractured Space | 10 | Energy bridges, cosmic rifts and void creatures. |

## First map: MAP_001 Obsidian Outpost

`MAP_001` is a 1000m × 1000m Obsidian Alien Frontier map with a central safe outpost, Commander Koral as quest giver, Scrapper Vex as merchant, obsidian and neon-spore resource nodes, regular glass-spider spawns, an elite obsidian golem, a trapped crashed-pod encounter and the night-only event boss **The Void Reaper**. It is the first map that must meet the complete delivery standard: loading screen, cache module, HUD, NPCs, monster roster, event, relationship tests and a Git commit.

## Integrity and testing rules adopted

Equippable items remain one-per-slot instances. The anti-cheat check validates `instanceId`, signed provenance, monotonic transaction order, plausible movement and harvest intervals; it does not treat two distinct copies of the same weapon as cheating. The test suite must cover provenance corruption, soil/seed compatibility, pet-equipment transfer, offline vector-clock merges and offline map-cache failures.

## Sequencing adjustments

The recommended Capacitor wrapper, CDN deployment and GitHub Actions deployment are deferred until the browser project has a stable PWA build and the first map is complete. This project will keep tRPC for the existing typed server contract; a REST/WebSocket replacement is not introduced unless Gemini's next engine-specific plan establishes a concrete integration need.
