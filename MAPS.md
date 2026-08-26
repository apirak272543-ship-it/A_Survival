# Map Module Playbook

The project supports a registry of **100 map modules**. Every module has a unique identifier, biome, an approximately **500 metre radius from its centre**, threat rating, content record, daytime mode, NPC landmark, resources, regular monsters, elite monster and a biome event boss. Runtime renders the visible area (target 96m radius) and keeps a small 128m data/prefetch margin rather than rendering the entire map. **Obsidian Frontier / MAP_001** is the current full visual slice; other modules remain catalog/prototype data until their own one-map delivery pass is completed.

## Per-map delivery rule

Before a map is implemented, Gemini is asked to propose visual treatment, biome identity, NPCs, monsters, resources, encounters, boss concept and additional suggestions. The suggestions that are technically and safely compatible are incorporated into the map brief. Work proceeds on **one map at a time**. A map is considered ready to commit only when its loading transition, map data, gameplay content, monster roster, event, replaceable asset pack, stream budget, test coverage and visual verification are complete.

## Map module contract

| Field | Purpose |
| --- | --- |
| `MapDefinition` | Radius, threat, accent colour, time mode and loading metadata. |
| `BiomeContent` | NPC, landmark, resources, surprise encounter and monster roster. |
| `MonsterModelBrief` | Gemini-directed silhouette, combat behavior, weakness, drop and effect language. |
| `status` | `prototype` for playable content, `planned` for registry content not yet delivered. |

> The registry exposes the intended 100-map roadmap. The modules may share the Babylon combat/collection framework, but visual completion is delivered one map at a time. Obsidian Frontier is the active map slice with its own pack-backed terrain families, flora/resources, landmarks and art direction. This does **not** claim that all 100 scenes, or all prototype monster action sets, are art-complete; a following map starts only after the current map is verified and the user approves the next pass.
