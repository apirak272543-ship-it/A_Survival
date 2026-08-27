import {
  calculateItemBalance,
  validateUniversalItem,
  type ItemBalanceProfile,
  type UniversalItemDefinition,
} from "./generators/universalItemEngine";

export const UNIVERSAL_ITEM_CONTRACT_VERSION = "universal-item-contract.v1" as const;
export const MAX_ITEM_POWER_BUDGET = 100;

export type UniversalItemContractInput = {
  item: Omit<UniversalItemDefinition, "balanceProfile">;
  maxPowerBudget?: number;
};

export type UniversalItemContractResult = {
  contractVersion: typeof UNIVERSAL_ITEM_CONTRACT_VERSION;
  valid: boolean;
  issues: string[];
  definition: UniversalItemDefinition;
  balanceProfile: ItemBalanceProfile;
  coverage: {
    hasStats: true;
    effectCount: number;
    resourceLinkCount: number;
    compatibilityRuleCount: number;
    recommendedBuildCount: number;
    combatRuntimeTransactionImplemented: false;
    craftingRuntimeTransactionImplemented: false;
  };
  runtimePolicy: {
    generatorReadOnly: true;
    inventoryMutationAllowed: false;
    equipmentMutationAllowed: false;
    combatMutationAllowed: false;
    craftingMutationAllowed: false;
    assetGenerationAllowed: false;
  };
};

function boundedBudget(value: number | undefined) {
  const budget = value ?? MAX_ITEM_POWER_BUDGET;
  if (!Number.isFinite(budget) || budget < 1 || budget > MAX_ITEM_POWER_BUDGET) throw new Error(`maxPowerBudget must be between 1 and ${MAX_ITEM_POWER_BUDGET}`);
  return budget;
}

export function evaluateUniversalItemContract(input: UniversalItemContractInput): UniversalItemContractResult {
  const maxPowerBudget = boundedBudget(input.maxPowerBudget);
  const balanceProfile = calculateItemBalance(input.item);
  const definition: UniversalItemDefinition = { ...input.item, balanceProfile };
  const validation = validateUniversalItem(definition, maxPowerBudget);
  return {
    contractVersion: UNIVERSAL_ITEM_CONTRACT_VERSION,
    valid: validation.valid,
    issues: validation.issues,
    definition,
    balanceProfile,
    coverage: {
      hasStats: true,
      effectCount: input.item.effects.length,
      resourceLinkCount: input.item.resources.length,
      compatibilityRuleCount: input.item.compatibility.length,
      recommendedBuildCount: input.item.recommendedBuilds.length,
      combatRuntimeTransactionImplemented: false,
      craftingRuntimeTransactionImplemented: false,
    },
    runtimePolicy: {
      generatorReadOnly: true,
      inventoryMutationAllowed: false,
      equipmentMutationAllowed: false,
      combatMutationAllowed: false,
      craftingMutationAllowed: false,
      assetGenerationAllowed: false,
    },
  };
}
