import { describe, expect, it } from "vitest";
import { canSpendStamina, createStaminaState, regenerateStamina, spendStamina, staminaPercent } from "../client/src/game/systems/staminaSystem";

describe("Arcane stamina system", () => {
  it("spends dash and attack costs without exceeding zero", () => {
    const start = createStaminaState();
    expect(spendStamina(start, "dash").state.current).toBe(75);
    expect(spendStamina(start, "attack").state.current).toBe(90);
    expect(spendStamina(createStaminaState(5), "dash").accepted).toBe(false);
  });

  it("drains sprint by elapsed seconds and regenerates with a cap", () => {
    const sprinted = spendStamina(createStaminaState(), "sprint", 2);
    expect(sprinted.accepted).toBe(true);
    expect(sprinted.state.current).toBe(70);
    expect(regenerateStamina(sprinted.state, 1).current).toBe(90);
    expect(regenerateStamina(createStaminaState(99), 1).current).toBe(100);
  });

  it("marks exhaustion at the threshold and exposes a readable percent", () => {
    const exhausted = spendStamina(createStaminaState(15), "attack").state;
    expect(exhausted.exhausted).toBe(true);
    expect(canSpendStamina(exhausted, "dash")).toBe(false);
    expect(canSpendStamina(exhausted, "attack")).toBe(false);
    expect(staminaPercent(exhausted)).toBe(5);
  });
});
