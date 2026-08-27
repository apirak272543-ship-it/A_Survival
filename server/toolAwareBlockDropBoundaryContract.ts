import { getBlockDefinition, type BlockState, type BlockToolTag, type WorldBlock } from "../client/src/game/data/blockModules";
import { resolveBlockBreak, type BlockDropKind } from "../client/src/game/systems/blockActionSystem";

export const TOOL_AWARE_BLOCK_DROP_BOUNDARY_VERSION = "tool-aware-block-drop-boundary.v1" as const;

export type ToolAwareBlockDropBoundaryResult = {
  contractVersion: typeof TOOL_AWARE_BLOCK_DROP_BOUNDARY_VERSION;
  valid: boolean;
  accepted: boolean;
  blockId: string;
  toolTag: BlockToolTag | null;
  requiredToolTag: BlockToolTag | null;
  usedCorrectTool: boolean;
  dropKind: BlockDropKind;
  dropDefinitionId: string | null;
  dropQuantity: number;
  placeableBlockItem: boolean;
  issues: string[];
  runtimePolicy: {
    inventoryMutated: false;
    worldStateMutated: false;
    durabilityMutated: false;
  };
};

function normalizeToolTag(toolTag: unknown): BlockToolTag | undefined {
  return toolTag === "pickaxe" || toolTag === "axe" || toolTag === "shears" ? toolTag : undefined;
}

function normalizeState(state: unknown): BlockState {
  return state === "intact" || state === "damaged" || state === "sapling" || state === "young" || state === "mature" || state === "decaying" || state === "broken" ? state : "intact";
}

export function evaluateToolAwareBlockDrop(input: { blockId: string; toolTag?: unknown; state?: unknown; key?: string }): ToolAwareBlockDropBoundaryResult {
  const definition = getBlockDefinition(input.blockId);
  const toolTag = normalizeToolTag(input.toolTag);
  const requiredToolTag = definition?.requiredToolTag ?? null;
  const issues: string[] = [];
  if (!definition) issues.push(`unknown block definition: ${input.blockId}`);
  const block: WorldBlock = {
    key: input.key ?? "0:0:0",
    blockId: input.blockId,
    moduleId: input.blockId,
    x: 0,
    y: 0,
    z: 0,
    state: normalizeState(input.state),
    hitPoints: Math.max(1, definition?.hardness ?? 1),
    maxHitPoints: Math.max(1, definition?.hardness ?? 1),
    solid: Boolean(definition?.solid),
    seed: 0,
  };
  const resolved = resolveBlockBreak(block, toolTag);
  if (!resolved.accepted) issues.push("block break is not accepted by the canonical resolver");
  if (resolved.dropKind === "block-item" && !resolved.dropDefinitionId) issues.push("block-item result must include a drop definition");
  if (resolved.dropKind !== "block-item" && resolved.dropQuantity !== 0) issues.push("non-block-item result must have zero quantity");
  const valid = issues.length === 0;
  return {
    contractVersion: TOOL_AWARE_BLOCK_DROP_BOUNDARY_VERSION,
    valid,
    accepted: resolved.accepted,
    blockId: input.blockId,
    toolTag: toolTag ?? null,
    requiredToolTag,
    usedCorrectTool: resolved.usedCorrectTool,
    dropKind: resolved.dropKind,
    dropDefinitionId: resolved.dropDefinitionId ?? null,
    dropQuantity: resolved.dropQuantity,
    placeableBlockItem: resolved.dropKind === "block-item",
    issues,
    runtimePolicy: { inventoryMutated: false, worldStateMutated: false, durabilityMutated: false },
  };
}

export function isToolAwareDropConsistent(result: Pick<ToolAwareBlockDropBoundaryResult, "requiredToolTag" | "toolTag" | "usedCorrectTool" | "dropKind" | "dropQuantity" | "placeableBlockItem">) {
  const matches = result.requiredToolTag !== null && result.requiredToolTag === result.toolTag;
  return result.usedCorrectTool === matches && result.placeableBlockItem === (result.dropKind === "block-item") && (result.dropKind === "block-item" ? result.dropQuantity > 0 : result.dropQuantity === 0);
}
