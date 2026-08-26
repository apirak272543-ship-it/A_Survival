export type StaminaState = {
  current: number;
  max: number;
  exhausted: boolean;
};

export type StaminaAction = "sprint" | "dash" | "attack";

export const STAMINA_RULES = {
  max: 100,
  sprintDrainPerSecond: 15,
  dashCost: 25,
  attackCost: 10,
  regenerationPerSecond: 20,
  exhaustionThreshold: 0.08,
  exhaustionSpeedMultiplier: 0.5,
} as const;

export function createStaminaState(current = STAMINA_RULES.max): StaminaState {
  return { current: Math.max(0, Math.min(STAMINA_RULES.max, current)), max: STAMINA_RULES.max, exhausted: current <= STAMINA_RULES.max * STAMINA_RULES.exhaustionThreshold };
}

export function canSpendStamina(state: StaminaState, action: StaminaAction) {
  if (state.exhausted && action !== "attack") return false;
  const cost = action === "dash" ? STAMINA_RULES.dashCost : action === "attack" ? STAMINA_RULES.attackCost : 0;
  return state.current >= cost;
}

export function spendStamina(state: StaminaState, action: StaminaAction, deltaSeconds = 0) {
  if (!canSpendStamina(state, action)) return { state, accepted: false };
  const drain = action === "sprint" ? STAMINA_RULES.sprintDrainPerSecond * Math.max(0, deltaSeconds) : action === "dash" ? STAMINA_RULES.dashCost : STAMINA_RULES.attackCost;
  const current = Math.max(0, state.current - drain);
  return { accepted: true, state: { ...state, current, exhausted: current <= state.max * STAMINA_RULES.exhaustionThreshold } };
}

export function regenerateStamina(state: StaminaState, deltaSeconds: number, resting = false) {
  const multiplier = resting ? 1.35 : 1;
  const current = Math.min(state.max, state.current + STAMINA_RULES.regenerationPerSecond * Math.max(0, deltaSeconds) * multiplier);
  return { ...state, current, exhausted: current <= state.max * STAMINA_RULES.exhaustionThreshold };
}

export function staminaPercent(state: StaminaState) {
  return Math.round((state.current / state.max) * 100);
}
