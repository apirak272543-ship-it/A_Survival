# Vault Quarantine & Local Equipment Milestone

Lobby `VAULT` now opens an item-instance inventory sheet. Safe equippable instances can toggle their local equipment slot and are saved via the existing offline session path. Any instance identified by `IntegrityReport.quarantinedInstanceIds` is still viewable, but **equip, use, trade and dismantle controls are disabled**.

| Situation | Behaviour |
|---|---|
| Safe weapon instance | Equip/unequip changes only `vaultEquipment`; it does not mutate quantity, instance ID or provenance |
| Quarantined instance | visual badge/striping and all actions disabled; user receives Thai recovery explanation |
| Trade / dismantle safe instance | explicit offline-prototype toast; no invisible state mutation |
| Recovery CTA | requests the established sync pipeline and keeps instance locked until a later integrity scan clears it |
| `?route=lobby&vault=demo` | visual verification route only; it does not add or modify a real save |

Unit tests cover safe equipment toggling, all-action quarantine blocking and unimplemented action truthfulness. Browser verification covers both normal and quarantine Vault layouts at 812×375.

> Limitation: server-authoritative equip/use/trade/dismantle transactions and persistent equipment provenance are intentionally not claimed by this milestone. The local slot is a prototype convenience state until those transactions are replayed and validated server-side.
