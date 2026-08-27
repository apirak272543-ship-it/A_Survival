import { describe, expect, it } from "vitest";
import { buildPlantGrowthStageContract } from "./plantGrowthStageContract";

const state = {
  key: "obsidian-farm:-3:0:2",
  plantId: "plant-001",
  seedItemId: "seed-plant-001",
  plantedAt: 10_000,
  growthDurationMs: 100_000,
  seed: 9107,
};

describe("plant growth stage contract", () => {
  it("projects the canonical four growth stages at deterministic boundaries", () => {
    const seed = buildPlantGrowthStageContract({ state, now: state.plantedAt });
    const sprout = buildPlantGrowthStageContract({ state, now: state.plantedAt + 25_000 });
    const young = buildPlantGrowthStageContract({ state, now: state.plantedAt + 55_000 });
    const mature = buildPlantGrowthStageContract({ state, now: state.plantedAt + state.growthDurationMs });

    expect(seed).toMatchObject({ stage: "seed", elapsedMs: 0, progress: 0, matureOnlyRewardGate: { eligible: false } });
    expect(sprout).toMatchObject({ stage: "sprout", elapsedMs: 25_000, progress: 0.25, matureOnlyRewardGate: { eligible: false } });
    expect(young).toMatchObject({ stage: "young", elapsedMs: 55_000, progress: 0.55, matureOnlyRewardGate: { eligible: false } });
    expect(mature).toMatchObject({
      stage: "mature",
      elapsedMs: 100_000,
      progress: 1,
      thresholdsMs: { seedUntil: 25_000, sproutUntil: 55_000, matureAt: 100_000 },
      matureOnlyRewardGate: { eligible: true, rewardCreated: false, rewardGranted: false, harvestMutationApplied: false },
    });
    expect(mature.issues).toEqual([]);
  });

  it("keeps equal input deterministic and uses no wall clock when now is omitted", () => {
    const first = buildPlantGrowthStageContract({ state });
    const second = buildPlantGrowthStageContract({ state });

    expect(first).toEqual(second);
    expect(first.now).toBe(state.plantedAt);
    expect(first.stage).toBe("seed");
    expect(first.issues).toEqual([{ code: "NOW_DEFAULTED_TO_PLANTED_AT", field: "now", detail: "now was omitted; plantedAt was used so the projection remains deterministic and does not read a clock" }]);
    expect(first.contentSha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("normalizes malformed rehydration timestamps and preserves a bounded read-only projection", () => {
    const result = buildPlantGrowthStageContract({
      state: { ...state, key: "", plantId: null, seedItemId: undefined, plantedAt: -5, growthDurationMs: 1, seed: Number.POSITIVE_INFINITY },
      now: Number.POSITIVE_INFINITY,
    });

    expect(result.valid).toBe(false);
    expect(result.state).toEqual({ key: "plant-state", plantId: "plant-unknown", seedItemId: "seed-unknown", plantedAt: 0, growthDurationMs: 30_000, seed: 1 });
    expect(result.now).toBe(0);
    expect(result.elapsedMs).toBe(0);
    expect(result.progress).toBe(0);
    expect(result.stage).toBe("seed");
    expect(result.issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      "PLANTED_AT_NORMALIZED",
      "GROWTH_DURATION_NORMALIZED",
      "NOW_NORMALIZED",
      "IDENTIFIER_DEFAULTED",
      "SEED_NORMALIZED",
    ]));
  });

  it("does not create rewards, mutate harvest state, write storage, or claim player acceptance", () => {
    const result = buildPlantGrowthStageContract({ state, now: state.plantedAt + state.growthDurationMs });

    expect(result.matureOnlyRewardGate).toEqual({ eligible: true, rewardCreated: false, rewardGranted: false, harvestMutationApplied: false });
    expect(result.claims).toEqual({ growthSimulation: false, rewardCreation: false, rewardGrant: false, harvestMutation: false, storageWrite: false, playerVisible: false });
    expect(result.blockers.map(blocker => blocker.id)).toEqual(["durable-time-rehydration", "mature-harvest-integration", "browser-device-playtest"]);
  });
});
