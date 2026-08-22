# Map Module Playbook

The project supports a registry of **100 map modules**. Every module has a unique identifier, biome, map radius between 1,000 and 1,500 metres, threat rating, content record, daytime mode, NPC landmark, resources, regular monsters, elite monster and a biome event boss. **MAP_001–MAP_010** are now selectable prototype expeditions with dedicated key art and curated Gemini-derived content records; MAP_011 onward remain planned modules that will only be developed upon the user's explicit instruction.

## Per-map delivery rule

Before a map is implemented, Gemini is asked to propose visual treatment, biome identity, NPCs, monsters, resources, encounters, boss concept and additional suggestions. The suggestions that are technically and safely compatible are incorporated into the map brief. A map is considered ready to commit only when its loading transition, map data, gameplay content, monster roster, event, test coverage and visual verification are complete.

## Map module contract

| Field | Purpose |
| --- | --- |
| `MapDefinition` | Radius, threat, accent colour, time mode and loading metadata. |
| `BiomeContent` | NPC, landmark, resources, surprise encounter and monster roster. |
| `MonsterModelBrief` | Gemini-directed silhouette, combat behavior, weakness, drop and effect language. |
| `status` | `prototype` for playable content, `planned` for registry content not yet delivered. |

> The registry exposes the intended 100-map roadmap. The first ten modules share the current Babylon combat/collection framework while MAP_001 alone has bespoke in-scene monster/resource/boss art. This does **not** claim that all 100 scenes, or all ten monster action sets, are art-complete; each scene is completed and published in a separate Git commit as requested.
