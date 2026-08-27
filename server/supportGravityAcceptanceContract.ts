import { getBlockDefinition, type WorldBlock } from "../client/src/game/data/blockModules";
import { getUnsupportedGravityBlocks, hasAdjacentSupport, type PlacementSupport } from "../client/src/game/systems/blockPhysicsSystem";
import type { BlockWorld } from "../client/src/game/systems/blockWorldSystem";

export type SupportGravityAssessment = {
  blockId: string;
  coordinate: { x: number; y: number; z: number };
  known: boolean;
  supportRequired: boolean;
  gravityAffected: boolean;
  supported: boolean;
  accepted: boolean;
  reason: "unknown-block" | "floating-allowed" | "supported" | "requires-support";
};

export type SupportGravitySummary = {
  blockCount: number;
  supportRequiredCount: number;
  gravityAffectedCount: number;
  unsupportedGravityCount: number;
  safe: boolean;
};

function validCoordinate(value: number) {
  return Number.isFinite(value) && Number.isInteger(value);
}

export function evaluateSupportGravity(world: BlockWorld, blockId: string, coordinate: { x: number; y: number; z: number }, terrainSupport?: PlacementSupport): SupportGravityAssessment {
  const definition = getBlockDefinition(blockId);
  if (!definition || ![coordinate.x, coordinate.y, coordinate.z].every(validCoordinate)) {
    return { blockId, coordinate, known: false, supportRequired: true, gravityAffected: false, supported: false, accepted: false, reason: "unknown-block" };
  }
  const supportRequired = !definition.canFloat;
  const supported = hasAdjacentSupport(world, coordinate.x, coordinate.y, coordinate.z, terrainSupport);
  const accepted = !supportRequired || supported;
  return {
    blockId,
    coordinate,
    known: true,
    supportRequired,
    gravityAffected: Boolean(definition.gravityAffected),
    supported,
    accepted,
    reason: accepted ? (supportRequired ? "supported" : "floating-allowed") : "requires-support",
  };
}

export function summarizeSupportGravity(world: BlockWorld): SupportGravitySummary {
  const blocks = Array.from(world.blocks.values());
  const definitions = blocks.map(block => getBlockDefinition(block.blockId)).filter((definition): definition is NonNullable<typeof definition> => Boolean(definition));
  const unsupportedGravity = getUnsupportedGravityBlocks(world);
  return {
    blockCount: blocks.length,
    supportRequiredCount: definitions.filter(definition => !definition.canFloat).length,
    gravityAffectedCount: definitions.filter(definition => definition.gravityAffected).length,
    unsupportedGravityCount: unsupportedGravity.length,
    safe: unsupportedGravity.length === 0,
  };
}

export function validateSupportGravitySummary(world: BlockWorld, summary: SupportGravitySummary) {
  const expected = summarizeSupportGravity(world);
  return {
    valid: summary.blockCount === expected.blockCount
      && summary.supportRequiredCount === expected.supportRequiredCount
      && summary.gravityAffectedCount === expected.gravityAffectedCount
      && summary.unsupportedGravityCount === expected.unsupportedGravityCount
      && summary.safe === expected.safe,
    expected,
  };
}

export function listUnsupportedGravityBlocks(world: BlockWorld): WorldBlock[] {
  return getUnsupportedGravityBlocks(world);
}
