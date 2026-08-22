export type ServerVectorClock = Record<string, number>;

export function mergeServerClock(left: ServerVectorClock, right: ServerVectorClock): ServerVectorClock {
  const merged: ServerVectorClock = { ...left };
  Object.entries(right).forEach(([actor, value]) => { merged[actor] = Math.max(merged[actor] ?? 0, value); });
  return merged;
}

export function incrementServerClock(clock: ServerVectorClock) {
  return { ...clock, server: (clock.server ?? 0) + 1 };
}
