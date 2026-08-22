# MAP_002 Ashen Obsidian Plains Gameplay Slice

MAP_002 now has a map-specific client-side loop beyond shared exploration: Scavenger Jax safe camp, Ember Ore harvest provenance, deterministic Ash Storm modifiers, Ash Crawler reinforcements, Obsidian Shell Golem emergence condition, Pyroclastic Altar telegraph, Behemoth persistence, and defeat reset to Jax.

| Trigger | Outcome |
|---|---|
| Enter Ash Storm window | HUD warning, 1.2× enemy movement and 2× rare-drop multiplier signal; two crawler reinforcements on transition |
| Harvest 3 resources / defeat 5 crawlers | elite telegraph and Obsidian Shell Golem presence |
| Interact at altar during storm | 2.6-second Behemoth telegraph then persistent boss presence |
| Harvest Ember Ore | `material-007` inventory instance through reward callback, with `map002-ember-ore-*` provenance event |
| Player defeat | health/position reset at Scavenger Jax safe camp |

Tests cover storm determinism, elite threshold, boss telegraph and boss-state persistence. MAP_002 is still an **enhanced gameplay slice**, not a complete boss combat/audio/drop implementation.
