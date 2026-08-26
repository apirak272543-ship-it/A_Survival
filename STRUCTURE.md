# Arcane Frontier Survival — Structure

## Runtime layers

```text
React routes and overlay UI
├── Landing / Player ID / Lobby / Map selection / Load transition
├── HUD and touch controls
└── GameCanvas (single Babylon canvas)
    └── client/src/game (plain TypeScript game domain)
        ├── GameWorld / Scene factory
        ├── Player / Enemy / Pet / Pickup
        ├── Health / Inventory / Weapon handling / Farm systems
        ├── Input manager / Camera controller / HUD event bridge
        └── Biome catalog / on-demand scene bundle loader

tRPC server and database
├── Player profile and device binding
├── Save snapshot and sync action queue
├── Inventory rows and equipped loadout
└── Item provenance events and validation
```

## Route and state model

| Route or mode | Purpose | Persisted state |
| --- | --- | --- |
| `/` | Landing and Player ID entry | `playerId`, device key |
| `/lobby` | Character showcase, loadout, shop, cosmetics, home and deploy actions | profile, loadout, currency |
| `/home` | Personal homestead, farm plots, placed structures and pet management | home state, crops, pet equipment |
| `/maps` | On-demand biome selection | last map and map metadata |
| `/play/:mapId` | Babylon gameplay scene plus touch HUD | health, inventory delta, world action log |
| `/settings` | In-game graphics, audio and control preferences | local visual/audio preferences |

## Map catalog

Every expedition map carries `id`, `displayName`, `biome`, `radiusMeters`, `threatLevel`, `resourceBias`, `bundleKey`, `accentColor`, and `status`. The target design range is 1,000–1,500 metres measured outward from spawn; the initial playable implementation uses a 1,200 metre nominal radius with streamed/procedural sectors to preserve mobile performance.

| Map | Biome | Primary mood | Initial status |
| --- | --- | --- | --- |
| Obsidian Frontier | Ruined volcanic alien frontier | Cyan ley-lines, violet fog, zombie ruins | Playable prototype |
| Ashen Hellscape | Infernal world | Lava ash and blood-red portals | Catalog-ready |
| Mars Expanse | Martian badlands | Rust dunes and abandoned probes | Catalog-ready |
| Saharan Glass | Desert | Crystalline storms and buried labs | Catalog-ready |
| Congo Verdant | Dense alien jungle | Xenoflora and luminous spores | Catalog-ready |
| Stonecrest Range | Rocky mountain | Ancient pylons and wind caverns | Catalog-ready |
| Wildpine Highlands | Forest mountain | Wild magic and cyber shrines | Catalog-ready |
| Astral Drift | Space frontier | Fractured platforms and void fields | Catalog-ready |

## Equipment and combat model

The game has no locked class. The currently equipped weapon supplies active attacks, movement trade-offs and status effects. The initial set covers a light melee blade/shield, plasma greatsword, dual rune pistols, void beam rifle, and bio-needler staff. Pets are independent companions with their own equipment slots and survival-oriented bonuses. The graphic preference model controls quality preset, particle/effect intensity, terrain detail, shadow setting, music volume, SFX volume, reduced motion and touch-control preference.

## Catalog, farming and item-instance rules

The catalog is data-driven and supports up to 400 definitions per principal category. The first catalog categories are swords, bows, ranged weapons, seeds, materials, furniture, decorations and modular structures. Definitions carry tier, tags, recipe/effect metadata, stack limit and provenance requirements. Tier distribution is intentionally weighted so common, uncommon and rare items have clearly different availability; legendary and mythic slots are scarce rather than merely recolored common drops.

Weapons and wearable equipment always use `stackLimit: 1`. A player can own many weapon or equipment instances, including instances of the same definition, but each instance has a separate ID, provenance chain and enhancement level; an equipment instance cannot be stacked as a quantity greater than one. Materials and seeds may use their own stack limits.

Farming uses five readable soil groups—Terra Loam, Ashen Volcanic, Red Dune, Verdant Humus and Aether Crystal. Each seed points to one compatible soil group, and the UI must show compatibility before a crop is planted.

## Data integrity boundary

Player ID is an identifier, not a secret. The prototype binds the initial local device to a generated device token and stores local actions as a chained log. The server validates source type, amount, item instance ID, stack limit, enhancement cap and parent event when syncing. This creates auditability and detects basic fabricated records, but browser-side data cannot be treated as cheat-proof in a production game. A production release needs server-authoritative simulation or server-issued signed action tickets for valuable rewards.

## Runtime blueprint learned from historical mobile voxel analysis

The historical APK analysis is a design reference only. A_Survival keeps an independent browser architecture with no imported code, names, package identifiers or proprietary assets. The main boundary is:

```text
App Shell / PWA
├── React route state, landscape/safe-area layout, error boundary, service worker
├── Player ID and local-first session bootstrap
└── GameCanvas
    ├── Asset Pack Registry / Resolver
    │   ├── manifest validation, namespace, version and dependency checks
    │   ├── assetId → relative path resolution, SHA-256 and Cache Storage
    │   └── fallback and future override-stack policy
    ├── Babylon Game Runtime
    │   ├── scene/camera/lights, input bridge and render loop
    │   ├── player/pet/enemy/pickup entity roots
    │   ├── stamina/combat/encounter state machines
    │   └── feedback hooks for effects/audio without owning React layout
    ├── World / Region Runtime
    │   ├── deterministic map catalog and terrain chunk boundaries
    │   ├── visible-region culling around the player
    │   └── future worker-backed generation and streamed region persistence
    └── Persistence / Transport Boundary
        ├── IndexedDB world/map state and offline action queue
        ├── tRPC sync with device-token and integrity checks
        └── future LAN/online transport interface; no MMO authority claim yet
```

The App Shell owns DOM, route and safe-area concerns. The Pack Registry owns manifest metadata, cache and binary asset resolution. The Game Runtime owns Babylon objects and simulation ticks. World/Region owns chunk data and visible-region selection. Persistence owns IndexedDB and queued transactions. No layer may write another layer's storage or bypass the server integrity boundary. This preserves `LocalPlayerProfile`, `RoomSessionSnapshot` and `SharedWorldState` as separate concepts for the future local-first LAN contract.

The first implementation of the blueprint is intentionally incremental: model files are separate GLB entries, item definitions carry `iconAssetId`, terrain is split into 16×16 chunk meshes, visible chunks are selected by a pure tested system, and the mobile HUD has an explicit `USE` action. Full worker streaming, authoritative multiplayer and runtime GLB animation clips remain planned rather than silently treated as complete.
