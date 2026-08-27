import { describe, expect, it } from "vitest";
import {
  createQuestProgressionRegistry,
  generateQuestProgression,
  MAX_STORY_MAPS,
  PLAYABLE_STORY_MAP_ID,
  QUESTS_PER_MAP,
  validateQuestProgression,
} from "./generators/questProgressionGenerator";

describe("story quest progression generator", () => {
  it("generates 100 connected maps with 20 quests per map", () => {
    const output = generateQuestProgression();
    expect(output.maps).toHaveLength(MAX_STORY_MAPS);
    expect(output.quests).toHaveLength(MAX_STORY_MAPS * QUESTS_PER_MAP);
    expect(output.maps[0]).toMatchObject({ mapIndex: 1, mapId: PLAYABLE_STORY_MAP_ID, runtimeStatus: "playable", runtimeImportAllowed: true });
    expect(output.maps[1]).toMatchObject({ mapIndex: 2, mapId: "story-map-002", runtimeStatus: "planned", runtimeImportAllowed: false });
    expect(output.maps.every(map => map.questIds)).toBe(true);
    expect(output.maps.every(map => map.questIds.length === QUESTS_PER_MAP)).toBe(true);
    expect(new Set(output.quests.map(quest => quest.id)).size).toBe(output.quests.length);
    expect(new Set(output.quests.map(quest => quest.title)).size).toBe(output.quests.length);
    expect(new Set(output.quests.map(quest => quest.storyBeat)).size).toBe(output.quests.length);
    expect(validateQuestProgression(output)).toEqual({ valid: true, issues: [] });
  });

  it("gates each next map behind the previous map quest chain", () => {
    const output = generateQuestProgression({ mapCount: 3 });
    const mapOneFinal = output.quests.find(quest => quest.mapIndex === 1 && quest.order === QUESTS_PER_MAP)!;
    const mapTwoFirst = output.quests.find(quest => quest.mapIndex === 2 && quest.order === 1)!;
    const mapTwoFinal = output.quests.find(quest => quest.mapIndex === 2 && quest.order === QUESTS_PER_MAP)!;
    const mapThreeFirst = output.quests.find(quest => quest.mapIndex === 3 && quest.order === 1)!;

    expect(mapOneFinal.unlocksMapIndex).toBe(2);
    expect(mapTwoFirst.prerequisites).toEqual(output.maps[0]!.questIds);
    expect(mapTwoFinal.unlocksMapIndex).toBe(3);
    expect(mapThreeFirst.prerequisites).toEqual(output.maps[1]!.questIds);
    expect(mapTwoFirst.objectives[0]!.required).toBeGreaterThanOrEqual(1);
    expect(mapTwoFirst.rewards[0]).toHaveProperty("itemDefinitionId");
    expect(validateQuestProgression(output, { mapCount: 3 })).toEqual({ valid: true, issues: [] });
  });

  it("is deterministic and rejects future maps imported as playable", () => {
    const registry = createQuestProgressionRegistry();
    const input = { mapCount: 4, seedLabel: "story-seed-01" };
    const first = registry.generate("quest.progression", input, { seed: "story-seed-01", generatedAt: 1 });
    const second = registry.generate("quest.progression", input, { seed: "story-seed-01", generatedAt: 99 });
    expect(first.contentHash).toBe(second.contentHash);
    expect(first.output).toEqual(second.output);
    expect(first.assetRefs).toEqual([]);

    const tampered = structuredClone(first.output);
    tampered.maps[1]!.runtimeImportAllowed = true;
    expect(validateQuestProgression(tampered, input).valid).toBe(false);
  });
});
