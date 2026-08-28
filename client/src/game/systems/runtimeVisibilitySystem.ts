export type RuntimeSpatialMetadata = {
  x?: unknown;
  z?: unknown;
  state?: unknown;
  coordinate?: { x?: unknown; z?: unknown };
};

export type RuntimeVisibilityInput = {
  positionX: number;
  positionZ: number;
  viewDistanceBlocks: number;
  safetyPaddingBlocks?: number;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function resolveCoordinate(metadata: RuntimeSpatialMetadata): { x: number; z: number } | null {
  const directX = finiteNumber(metadata.x);
  const directZ = finiteNumber(metadata.z);
  if (directX !== null && directZ !== null) return { x: directX, z: directZ };
  const coordinateX = finiteNumber(metadata.coordinate?.x);
  const coordinateZ = finiteNumber(metadata.coordinate?.z);
  return coordinateX !== null && coordinateZ !== null ? { x: coordinateX, z: coordinateZ } : null;
}

export function shouldEnableRuntimeObject(metadata: RuntimeSpatialMetadata | null | undefined, input: RuntimeVisibilityInput): boolean {
  if (metadata?.state === "broken") return false;
  const coordinate = metadata ? resolveCoordinate(metadata) : null;
  if (!coordinate) return true;
  const positionX = finiteNumber(input.positionX);
  const positionZ = finiteNumber(input.positionZ);
  const viewDistanceBlocks = finiteNumber(input.viewDistanceBlocks);
  if (positionX === null || positionZ === null || viewDistanceBlocks === null) return true;
  const padding = Math.max(0, finiteNumber(input.safetyPaddingBlocks) ?? 0);
  const radius = Math.min(100, Math.max(0, viewDistanceBlocks + padding));
  const dx = coordinate.x - positionX;
  const dz = coordinate.z - positionZ;
  return dx * dx + dz * dz <= radius * radius;
}
