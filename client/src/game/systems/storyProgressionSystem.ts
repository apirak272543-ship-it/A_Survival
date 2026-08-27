export const STORY_MAX_MAP_INDEX = 100;
export const STORY_QUESTS_PER_MAP = 20;
export const STORY_PLAYABLE_MAP_INDEX = 1;
export const STORY_PLAYABLE_MAP_ID = "obsidian-frontier" as const;

export type StoryMapRuntimeStatus = "playable" | "planned";

export type StoryProgressState = {
  completedQuestIds: string[];
  completedMapIndex: number;
  nextMapReadyIndex: number | null;
};

export type StoryProgressResult =
  | { accepted: true; state: StoryProgressState; questId: string; mapIndex: number; order: number; message: string }
  | { accepted: false; state: StoryProgressState; reason: string };

export function createDefaultStoryProgressState(): StoryProgressState {
  return { completedQuestIds: [], completedMapIndex: 0, nextMapReadyIndex: null };
}

function questIdFor(mapIndex: number, order: number) {
  return `story-map-${String(mapIndex).padStart(3, "0")}-quest-${String(order).padStart(2, "0")}`;
}

function parseQuestId(value: string) {
  const match = /^story-map-(\d{3})-quest-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const mapIndex = Number(match[1]);
  const order = Number(match[2]);
  if (mapIndex < 1 || mapIndex > STORY_MAX_MAP_INDEX || order < 1 || order > STORY_QUESTS_PER_MAP) return undefined;
  return { mapIndex, order };
}

export function getStoryMapRuntimeStatus(mapIndex: number): StoryMapRuntimeStatus {
  return mapIndex === STORY_PLAYABLE_MAP_INDEX ? "playable" : "planned";
}

export function getRuntimeStoryMapId(mapIndex: number) {
  return mapIndex === STORY_PLAYABLE_MAP_INDEX ? STORY_PLAYABLE_MAP_ID : null;
}

export function normalizeStoryProgressState(candidate: unknown): StoryProgressState {
  if (!candidate || typeof candidate !== "object" || Array.isArray(candidate)) return createDefaultStoryProgressState();
  const raw = candidate as Record<string, unknown>;
  const rawIds = Array.isArray(raw.completedQuestIds) ? raw.completedQuestIds.filter((value): value is string => typeof value === "string") : [];
  const validIds = Array.from(new Set(rawIds.filter(id => {
    const parsed = parseQuestId(id);
    return Boolean(parsed && parsed.mapIndex === STORY_PLAYABLE_MAP_INDEX);
  }))).sort();
  const contiguousIds: string[] = [];
  for (let order = 1; order <= STORY_QUESTS_PER_MAP; order += 1) {
    const id = questIdFor(STORY_PLAYABLE_MAP_INDEX, order);
    if (!validIds.includes(id)) break;
    contiguousIds.push(id);
  }
  const completedMapIndex = contiguousIds.length === STORY_QUESTS_PER_MAP ? STORY_PLAYABLE_MAP_INDEX : 0;
  return {
    completedQuestIds: contiguousIds,
    completedMapIndex,
    nextMapReadyIndex: completedMapIndex >= STORY_PLAYABLE_MAP_INDEX ? STORY_PLAYABLE_MAP_INDEX + 1 : null,
  };
}

export function getNextStoryQuestId(state: StoryProgressState) {
  const nextOrder = state.completedQuestIds.length + 1;
  return nextOrder > STORY_QUESTS_PER_MAP ? null : questIdFor(STORY_PLAYABLE_MAP_INDEX, nextOrder);
}

export function canCompleteStoryQuest(state: StoryProgressState, questId: string) {
  const parsed = parseQuestId(questId);
  if (!parsed) return { accepted: false as const, reason: "ไม่พบรหัสเควสที่ตรวจสอบได้" };
  if (parsed.mapIndex !== STORY_PLAYABLE_MAP_INDEX) return { accepted: false as const, reason: "เควสของแผนที่อนาคตยังเป็นข้อมูล planned และยังเล่นไม่ได้" };
  if (state.completedQuestIds.includes(questId)) return { accepted: false as const, reason: "เควสนี้ผ่านไปแล้ว" };
  const expected = getNextStoryQuestId(state);
  if (expected !== questId) return { accepted: false as const, reason: `ต้องทำ ${expected ?? "เควสในบทนี้ครบแล้ว"} ก่อน` };
  return { accepted: true as const, mapIndex: parsed.mapIndex, order: parsed.order };
}

export function completeStoryQuest(input: { state: StoryProgressState; questId: string; now: number }): StoryProgressResult {
  const check = canCompleteStoryQuest(input.state, input.questId);
  if (!check.accepted) return { accepted: false, state: input.state, reason: check.reason };
  const completedQuestIds = input.state.completedQuestIds.concat(input.questId);
  const completedMapIndex = completedQuestIds.length === STORY_QUESTS_PER_MAP ? STORY_PLAYABLE_MAP_INDEX : input.state.completedMapIndex;
  return {
    accepted: true,
    state: { completedQuestIds, completedMapIndex, nextMapReadyIndex: completedMapIndex >= STORY_PLAYABLE_MAP_INDEX ? STORY_PLAYABLE_MAP_INDEX + 1 : null },
    questId: input.questId,
    mapIndex: check.mapIndex,
    order: check.order,
    message: check.order === STORY_QUESTS_PER_MAP ? "เควสของ Obsidian Frontier ครบแล้ว · บทถัดไปยังรอการเปิดใช้ runtime" : `ผ่านเควสลำดับ ${check.order}/20 ของ Obsidian Frontier แล้ว`,
  };
}

export function getStoryProgressSummary(state: StoryProgressState) {
  return {
    playableMapId: STORY_PLAYABLE_MAP_ID,
    completedQuestCount: state.completedQuestIds.length,
    questsPerPlayableMap: STORY_QUESTS_PER_MAP,
    currentQuestId: getNextStoryQuestId(state),
    completedMapIndex: state.completedMapIndex,
    nextMapReadyIndex: state.nextMapReadyIndex,
    futureMapsRuntimeImportAllowed: false as const,
  };
}
