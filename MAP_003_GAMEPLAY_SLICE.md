# MAP_003 Bioluminescent Caverns Gameplay Slice

MAP_003 now adds a specific Bioluminescent Caverns loop above the shared expedition framework: Researcher Lyra safe zone, Glow Crystal harvest provenance, deterministic Spore Bloom, healing/enrage modifiers, Luminous Stalker reveal, Mycelium shrine telegraph and Empress persistence.

| Trigger | Outcome |
|---|---|
| Enter Spore Bloom window | HUD warning, player heals 5 health/second, enemy movement becomes ×1.25 and two beetle reinforcements arrive |
| Harvest 2 crystals / defeat 4 beetles | Luminous Stalker reveal |
| Interact at shrine during bloom | 2.6-second Mycelium Empress telegraph then persistent boss presence |
| Harvest Glow Crystal | `material-003` through reward callback with `map003-glow-crystal-*` provenance event |
| Player defeat | health/position reset at Researcher Lyra safe camp |

Tests cover bloom modifiers, elite reveal, shrine telegraph and boss-state persistence. This is an **enhanced gameplay slice**, not a complete boss combat/audio/drop implementation.
