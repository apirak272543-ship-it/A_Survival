import {
  evaluateStructurePlacement,
  repairStructureCandidate,
  STRUCTURE_BLUEPRINT_LIBRARY,
  validateStructureBlueprints,
  type StructureBlueprint,
  type StructurePlacementCandidate,
} from "./generators/structureGenerator";

export const STRUCTURE_PLACEMENT_BOUNDARY_VERSION = "structure-placement-boundary.v1" as const;

export type StructurePlacementBoundaryResult = {
  contractVersion: typeof STRUCTURE_PLACEMENT_BOUNDARY_VERSION;
  valid: boolean;
  placementAccepted: boolean;
  issues: string[];
  blueprintId: string;
  mapId: string;
  score: number;
  reasons: string[];
  repairs: string[];
  repairedCandidate: StructurePlacementCandidate;
  assetRefs: StructureBlueprint["assetRefs"];
  runtimePolicy: {
    backendOnly: true;
    playerFacingGeneratorUi: false;
    assetGenerationAllowed: false;
    persistenceWritePerformed: false;
    futureMapPlayable: false;
  };
};

export function evaluateStructurePlacementBoundary(input: {
  blueprint: StructureBlueprint;
  candidate: StructurePlacementCandidate;
}): StructurePlacementBoundaryResult {
  const blueprintValidation = validateStructureBlueprints([input.blueprint]);
  const repairedCandidate = repairStructureCandidate(input.blueprint, input.candidate);
  const evaluation = evaluateStructurePlacement(input.blueprint, input.candidate);
  const issues = [...blueprintValidation.issues];
  if (!input.candidate.context.mapId || input.candidate.context.mapId !== input.candidate.context.mapId.trim()) issues.push("candidate mapId must be a non-empty trimmed value");
  return {
    contractVersion: STRUCTURE_PLACEMENT_BOUNDARY_VERSION,
    valid: issues.length === 0,
    placementAccepted: evaluation.accepted,
    issues,
    blueprintId: input.blueprint.id,
    mapId: input.candidate.context.mapId,
    score: evaluation.score,
    reasons: evaluation.reasons,
    repairs: evaluation.repairs,
    repairedCandidate,
    assetRefs: input.blueprint.assetRefs,
    runtimePolicy: {
      backendOnly: true,
      playerFacingGeneratorUi: false,
      assetGenerationAllowed: false,
      persistenceWritePerformed: false,
      futureMapPlayable: false,
    },
  };
}

export function getStarterStructureBlueprint() {
  return STRUCTURE_BLUEPRINT_LIBRARY[0]!;
}
