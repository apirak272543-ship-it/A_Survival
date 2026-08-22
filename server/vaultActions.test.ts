import { describe, expect, it } from "vitest";
import { createStarterInstance } from "../client/src/game/data/catalog";
import { getVaultActionState, toggleVaultEquipment } from "../client/src/game/integrity/vaultActions";

describe("Vault action quarantine", () => {
  it("allows an equipable safe instance and toggles only its own equipment slot", () => {
    const sword = createStarterInstance("sword-001", 1);
    expect(getVaultActionState(sword, new Set(), "equip")).toMatchObject({ allowed: true });
    expect(toggleVaultEquipment({}, sword, new Set())).toEqual({ sword: sword.instanceId });
    expect(toggleVaultEquipment({ sword: sword.instanceId }, sword, new Set())).toEqual({ sword: undefined });
  });

  it("blocks every action for a quarantined instance without changing equipment", () => {
    const sword = createStarterInstance("sword-001", 1);
    const quarantined = new Set([sword.instanceId]);
    expect(getVaultActionState(sword, quarantined, "equip").allowed).toBe(false);
    expect(getVaultActionState(sword, quarantined, "use").allowed).toBe(false);
    expect(toggleVaultEquipment({}, sword, quarantined)).toEqual({});
  });

  it("keeps unimplemented use, trade and dismantle explicit rather than mutating inventory", () => {
    const material = createStarterInstance("material-001", 1);
    expect(getVaultActionState(material, new Set(), "use").allowed).toBe(false);
    expect(getVaultActionState(material, new Set(), "trade").reason).toContain("แลกเปลี่ยน");
    expect(getVaultActionState(material, new Set(), "dismantle").reason).toContain("ย่อยสลาย");
  });
});
