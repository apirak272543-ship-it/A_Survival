# MAP_004 Crystalline Spires Gameplay Slice

MAP_004 extends the shared expedition with Cartographer Zephyr safe camp, Resonance Shard harvest provenance, deterministic Reflection Laser Field, a refractor recovery interaction, Prism Golem reveal, Resonance dais telegraph and persistent Archon presence.

| Trigger | Outcome |
|---|---|
| Reflection field window | HUD warning, 5 health/sec pressure, 0.72 player movement and two Shard Gnat reinforcements |
| Interact at refractor | diverts the laser for that active field cycle |
| Harvest 3 shards / defeat 4 gnats | Prism Golem reveal |
| Interact at dais after elite unlock | 2.6-second Archon telegraph then persistent boss presence |
| Harvest Resonance Shard | `material-003` reward callback with `map004-resonance-shard-*` provenance event |
| Player defeat | health/position reset at Cartographer Zephyr camp |

Tests cover laser determinism, refractor clearing and boss persistence. This is an **enhanced gameplay slice**, not a complete boss/action/audio/drop implementation.
