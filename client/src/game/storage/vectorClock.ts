export type VectorClock = Record<string, number>;

export type VectorClockRelation = "before" | "after" | "equal" | "concurrent";

export function incrementVectorClock(clock: VectorClock, actorId: string): VectorClock {
  return { ...clock, [actorId]: (clock[actorId] ?? 0) + 1 };
}

export function mergeVectorClocks(left: VectorClock, right: VectorClock): VectorClock {
  const merged: VectorClock = { ...left };
  Object.entries(right).forEach(([actor, value]) => { merged[actor] = Math.max(merged[actor] ?? 0, value); });
  return merged;
}

export function compareVectorClocks(left: VectorClock, right: VectorClock): VectorClockRelation {
  const actors = new Set(Object.keys(left).concat(Object.keys(right)));
  let leftGreater = false;
  let rightGreater = false;
  actors.forEach(actor => {
    const leftValue = left[actor] ?? 0;
    const rightValue = right[actor] ?? 0;
    if (leftValue > rightValue) leftGreater = true;
    if (rightValue > leftValue) rightGreater = true;
  });
  if (!leftGreater && !rightGreater) return "equal";
  if (leftGreater && !rightGreater) return "after";
  if (!leftGreater && rightGreater) return "before";
  return "concurrent";
}
