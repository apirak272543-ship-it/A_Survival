import { describe, expect, it } from "vitest";
import { compareVectorClocks, incrementVectorClock, mergeVectorClocks } from "../client/src/game/storage/vectorClock";
import { incrementServerClock, mergeServerClock } from "./syncVector";

describe("offline vector clock contract", () => {
  it("increments only the actor that produced a local action", () => {
    expect(incrementVectorClock({ deviceA: 2, server: 4 }, "deviceA")).toEqual({ deviceA: 3, server: 4 });
  });

  it("merges independent actor progress using the highest counter", () => {
    expect(mergeVectorClocks({ deviceA: 2, server: 1 }, { deviceB: 5, deviceA: 1 })).toEqual({ deviceA: 2, server: 1, deviceB: 5 });
  });

  it("recognizes causal ordering and concurrent updates deterministically", () => {
    expect(compareVectorClocks({ deviceA: 1 }, { deviceA: 2 })).toBe("before");
    expect(compareVectorClocks({ deviceA: 3 }, { deviceA: 2 })).toBe("after");
    expect(compareVectorClocks({ deviceA: 1, deviceB: 2 }, { deviceA: 2, deviceB: 1 })).toBe("concurrent");
    expect(compareVectorClocks({ deviceA: 2 }, { deviceA: 2 })).toBe("equal");
  });

  it("maintains server authority as a separate logical actor", () => {
    expect(mergeServerClock({ deviceA: 3 }, { deviceA: 2, deviceB: 1 })).toEqual({ deviceA: 3, deviceB: 1 });
    expect(incrementServerClock({ deviceA: 3, server: 6 })).toEqual({ deviceA: 3, server: 7 });
  });
});
