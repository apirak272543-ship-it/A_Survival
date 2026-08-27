import {
  CommonGeneratorRegistry,
  type GeneratorAssetRef,
  type GeneratorPlugin,
  type GeneratorValidationResult,
} from "./commonGeneratorApi";

export const QUEST_PROGRESSION_VERSION = "1.0.0" as const;
export const QUEST_PROGRESSION_SCHEMA_VERSION = "a-survival.quest-progression.v1" as const;
export const QUESTS_PER_MAP = 20;
export const MAX_STORY_MAPS = 100;
export const PLAYABLE_STORY_MAP_INDEX = 1;
export const PLAYABLE_STORY_MAP_ID = "obsidian-frontier";

export type QuestObjectiveKind = "collect" | "mine" | "defeat" | "harvest" | "place-block" | "visit" | "talk" | "craft";
export type QuestReward = {
  itemDefinitionId?: string;
  quantity?: number;
  abilityId?: string;
  reputation?: number;
};
export type QuestObjective = {
  id: string;
  kind: QuestObjectiveKind;
  targetId: string;
  required: number;
  description: string;
};
export type StoryMapProgression = {
  mapIndex: number;
  mapId: string;
  chapterTitle: string;
  location: string;
  arc: string;
  storySummary: string;
  runtimeStatus: "playable" | "planned";
  runtimeImportAllowed: boolean;
  questIds: string[];
  unlockRequiresQuestIds: string[];
};
export type QuestDefinition = {
  id: string;
  mapIndex: number;
  order: number;
  title: string;
  shortDetail: string;
  storyBeat: string;
  prerequisites: string[];
  objectives: QuestObjective[];
  rewards: QuestReward[];
  unlocksMapIndex?: number;
};

export type QuestProgressionInput = {
  mapCount?: number;
  questsPerMap?: number;
  seedLabel?: string;
};

export type QuestProgressionOutput = {
  schemaVersion: typeof QUEST_PROGRESSION_SCHEMA_VERSION;
  maps: StoryMapProgression[];
  quests: QuestDefinition[];
  constraints: {
    maps: number;
    questsPerMap: number;
    maxMaps: number;
    playableMapId: typeof PLAYABLE_STORY_MAP_ID;
    futureMapsRuntimeImportAllowed: false;
  };
};

const ARC_NAMES = [
  "เถ้าถ่านที่จำชื่อไม่ได้",
  "เสียงสะท้อนใต้ชั้นหิน",
  "สวนที่เติบโตจากรอยแยก",
  "ทางเดินของดาวดับ",
  "นครที่ไม่ยอมหลับ",
  "คำสาบานของผู้เฝ้าประตู",
  "พายุเหนือแกนโลก",
  "หอคอยที่กลับหัว",
  "ทะเลทรายกระจกแตก",
  "แสงสุดท้ายของแนวชายแดน",
] as const;

const LOCATIONS = [
  "ค่ายรอยแยกออบซิเดียน",
  "หุบผาเถ้าสะท้อน",
  "สวนสปอร์เรืองแสง",
  "สะพานดาวร่วง",
  "นครเครื่องจักรเงียบ",
  "ประตูหินของผู้เฝ้า",
  "ที่ราบพายุอีเธอร์",
  "หอคอยกลับขั้ว",
  "ทะเลทรายแก้วแดง",
  "ขอบฟ้าออบซิเดียน",
] as const;

const QUEST_VERBS = [
  "ตามรอย",
  "เก็บเศษ",
  "เปิดทาง",
  "ฟังเสียง",
  "ปลูกความหวัง",
  "ซ่อมแนวป้องกัน",
  "ล่ารอยเท้า",
  "ผูกสัญญาณ",
  "ทดสอบคม",
  "เฝ้าระวัง",
  "ส่งต่อแสง",
  "ชั่งน้ำหนัก",
  "คลี่ปม",
  "กู้แกน",
  "วางหมุด",
  "ปิดรอยรั่ว",
  "ทวงคืนคำตอบ",
  "เดินผ่านเงา",
  "เตรียมการ",
  "ยืนยันเส้นทาง",
] as const;

const OBJECTIVE_KINDS: readonly QuestObjectiveKind[] = ["visit", "collect", "mine", "harvest", "place-block", "talk", "craft", "defeat"];
const TARGETS = [
  "terrain.obsidian",
  "block-obsidian-ash",
  "seed-plant-001",
  "material-001",
  "material-002",
  "structure-001",
  "npc-map-warder",
  "glass-stalker",
] as const;
const REWARD_ITEMS = ["material-001", "material-002", "seed-plant-001", "block-obsidian-stone", "tool-001", "sword-001"] as const;

function boundedInteger(value: number | undefined, fallback: number, minimum: number, maximum: number) {
  const normalized = value ?? fallback;
  return Math.min(maximum, Math.max(minimum, Math.trunc(normalized)));
}

function mapIdForIndex(mapIndex: number) {
  return mapIndex === PLAYABLE_STORY_MAP_INDEX ? PLAYABLE_STORY_MAP_ID : `story-map-${String(mapIndex).padStart(3, "0")}`;
}

function questId(mapIndex: number, order: number) {
  return `story-map-${String(mapIndex).padStart(3, "0")}-quest-${String(order).padStart(2, "0")}`;
}

function mapStory(mapIndex: number) {
  const arcIndex = Math.floor((mapIndex - 1) / 10);
  const locationIndex = (mapIndex - 1) % LOCATIONS.length;
  return {
    arc: ARC_NAMES[arcIndex] ?? `เส้นทางที่ยังไม่มีชื่อ ${arcIndex + 1}`,
    location: LOCATIONS[locationIndex]!,
    chapterTitle: `บทที่ ${String(mapIndex).padStart(3, "0")} · ${ARC_NAMES[arcIndex] ?? "แนวทางใหม่"}`,
    storySummary: `การเดินทางลำดับที่ ${mapIndex} พาผู้รอดชีวิตผ่าน${LOCATIONS[locationIndex]} เพื่อเก็บชิ้นส่วนความทรงจำของโลกที่กำลังแตกออกจากกัน`,
  };
}

function objectiveFor(mapIndex: number, order: number): QuestObjective {
  const objectiveKind = OBJECTIVE_KINDS[(mapIndex + order - 2) % OBJECTIVE_KINDS.length]!;
  const targetId = TARGETS[(mapIndex * 3 + order - 2) % TARGETS.length]!;
  const required = objectiveKind === "visit" || objectiveKind === "talk" ? 1 : 2 + ((mapIndex + order) % 5);
  const description = objectiveKind === "visit"
    ? `ไปถึงจุดหมายที่ผูกกับ ${targetId}`
    : objectiveKind === "talk"
      ? `คุยกับผู้ดูแลเส้นทาง ${targetId}`
      : objectiveKind === "mine"
        ? `ขุด ${targetId} ให้ได้ ${required} ครั้ง`
        : objectiveKind === "harvest"
          ? `เก็บเกี่ยว ${targetId} จำนวน ${required}`
          : objectiveKind === "place-block"
            ? `วางบล็อก ${targetId} จำนวน ${required}`
            : objectiveKind === "defeat"
              ? `โค่นเป้าหมาย ${targetId} จำนวน ${required}`
              : objectiveKind === "craft"
                ? `ประกอบ ${targetId} จำนวน ${required}`
                : `เก็บ ${targetId} จำนวน ${required}`;
  return { id: `objective-${mapIndex}-${order}-01`, kind: objectiveKind, targetId, required, description: `แผนที่ ${mapIndex} · ${description}` };
}

function questFor(mapIndex: number, order: number, questsPerMap: number): QuestDefinition {
  const id = questId(mapIndex, order);
  const story = mapStory(mapIndex);
  const previousMapQuestIds = mapIndex > 1 && order === 1 ? Array.from({ length: questsPerMap }, (_, index) => questId(mapIndex - 1, index + 1)) : [];
  const previousQuestIds = order > 1 ? [questId(mapIndex, order - 1)] : [];
  const prerequisites = [...previousMapQuestIds, ...previousQuestIds];
  const objective = objectiveFor(mapIndex, order);
  const rewardItem = REWARD_ITEMS[(mapIndex + order - 2) % REWARD_ITEMS.length]!;
  const reward: QuestReward = {
    itemDefinitionId: rewardItem,
    quantity: 1 + ((mapIndex + order) % 3),
    reputation: 2 + (order % 4),
    ...(order === questsPerMap ? { abilityId: `ability.story.${String(mapIndex).padStart(3, "0")}` } : {}),
  };
  return {
    id,
    mapIndex,
    order,
    title: `${QUEST_VERBS[order - 1]!} ${story.location} · แผนที่ ${String(mapIndex).padStart(3, "0")} · ${String(order).padStart(2, "0")}`,
    shortDetail: `ภารกิจที่ ${order} ของแผนที่ ${mapIndex}: ${objective.description}`,
    storyBeat: `แผนที่ ${mapIndex} · ภารกิจ ${order}: การตัดสินใจครั้งนี้ทำให้เส้นทางของ${story.arc}ชัดขึ้น และเปิดความจริงอีกชั้นของ${story.location}`,
    prerequisites,
    objectives: [objective],
    rewards: [reward],
    ...(order === questsPerMap && mapIndex < MAX_STORY_MAPS ? { unlocksMapIndex: mapIndex + 1 } : {}),
  };
}

export function generateQuestProgression(input: QuestProgressionInput = {}): QuestProgressionOutput {
  const mapCount = boundedInteger(input.mapCount, MAX_STORY_MAPS, 1, MAX_STORY_MAPS);
  const questsPerMap = boundedInteger(input.questsPerMap, QUESTS_PER_MAP, QUESTS_PER_MAP, QUESTS_PER_MAP);
  const maps: StoryMapProgression[] = [];
  const quests: QuestDefinition[] = [];
  for (let mapIndex = 1; mapIndex <= mapCount; mapIndex += 1) {
    const story = mapStory(mapIndex);
    const mapQuestIds = Array.from({ length: questsPerMap }, (_, index) => questId(mapIndex, index + 1));
    maps.push({
      mapIndex,
      mapId: mapIdForIndex(mapIndex),
      chapterTitle: story.chapterTitle,
      location: story.location,
      arc: story.arc,
      storySummary: story.storySummary,
      runtimeStatus: mapIndex === PLAYABLE_STORY_MAP_INDEX ? "playable" : "planned",
      runtimeImportAllowed: mapIndex === PLAYABLE_STORY_MAP_INDEX,
      questIds: mapQuestIds,
      unlockRequiresQuestIds: mapIndex === 1 ? [] : Array.from({ length: questsPerMap }, (_, index) => questId(mapIndex - 1, index + 1)),
    });
    for (let order = 1; order <= questsPerMap; order += 1) quests.push(questFor(mapIndex, order, questsPerMap));
  }
  return {
    schemaVersion: QUEST_PROGRESSION_SCHEMA_VERSION,
    maps,
    quests,
    constraints: { maps: mapCount, questsPerMap, maxMaps: MAX_STORY_MAPS, playableMapId: PLAYABLE_STORY_MAP_ID, futureMapsRuntimeImportAllowed: false },
  };
}

export function validateQuestProgression(output: QuestProgressionOutput, input: QuestProgressionInput = {}): GeneratorValidationResult {
  const issues: string[] = [];
  const expectedMaps = boundedInteger(input.mapCount, MAX_STORY_MAPS, 1, MAX_STORY_MAPS);
  const expectedQuestsPerMap = boundedInteger(input.questsPerMap, QUESTS_PER_MAP, 1, QUESTS_PER_MAP);
  if (output.schemaVersion !== QUEST_PROGRESSION_SCHEMA_VERSION) issues.push("unsupported quest progression schema");
  if (output.maps.length !== expectedMaps) issues.push(`expected ${expectedMaps} maps, received ${output.maps.length}`);
  if (output.quests.length !== expectedMaps * expectedQuestsPerMap) issues.push(`expected ${expectedMaps * expectedQuestsPerMap} quests, received ${output.quests.length}`);
  if (output.constraints.futureMapsRuntimeImportAllowed) issues.push("future maps must not be runtime importable");
  const ids = new Set<string>();
  for (const map of output.maps) {
    if (map.mapIndex < 1 || map.mapIndex > MAX_STORY_MAPS) issues.push(`map index out of range: ${map.mapIndex}`);
    if (map.mapId !== mapIdForIndex(map.mapIndex)) issues.push(`unexpected map id: ${map.mapId}`);
    if (map.mapIndex === PLAYABLE_STORY_MAP_INDEX && (!map.runtimeImportAllowed || map.runtimeStatus !== "playable")) issues.push("Obsidian map must be the only playable story map");
    if (map.mapIndex > PLAYABLE_STORY_MAP_INDEX && (map.runtimeImportAllowed || map.runtimeStatus !== "planned")) issues.push(`future map is runtime importable: ${map.mapId}`);
    if (map.questIds.length !== expectedQuestsPerMap) issues.push(`map has wrong quest count: ${map.mapId}`);
    for (const id of map.questIds) {
      if (ids.has(id)) issues.push(`duplicate quest id: ${id}`);
      ids.add(id);
    }
  }
  const mapQuestCounts = new Map<number, number>();
  for (const quest of output.quests) {
    mapQuestCounts.set(quest.mapIndex, (mapQuestCounts.get(quest.mapIndex) ?? 0) + 1);
    if (!ids.has(quest.id)) issues.push(`quest is not listed by a map: ${quest.id}`);
    if (quest.objectives.length === 0 || quest.objectives.some(objective => objective.required < 1)) issues.push(`invalid objective: ${quest.id}`);
    if (quest.rewards.length === 0) issues.push(`quest has no reward: ${quest.id}`);
    if (quest.order === 1 && quest.mapIndex > 1 && quest.prerequisites.length !== expectedQuestsPerMap) issues.push(`map gate is incomplete: ${quest.id}`);
  }
  for (let mapIndex = 1; mapIndex <= expectedMaps; mapIndex += 1) {
    if ((mapQuestCounts.get(mapIndex) ?? 0) !== expectedQuestsPerMap) issues.push(`map ${mapIndex} does not contain ${expectedQuestsPerMap} quests`);
  }
  return { valid: issues.length === 0, issues };
}

export const questProgressionGeneratorPlugin: GeneratorPlugin<QuestProgressionInput, QuestProgressionOutput> = {
  id: "quest.progression",
  version: QUEST_PROGRESSION_VERSION,
  kind: "quest",
  generate: input => generateQuestProgression(input),
  validate: (output, input) => validateQuestProgression(output, input),
  preview: output => ({
    recordCount: output.quests.length,
    ids: output.maps.slice(0, 100).map(map => map.mapId),
    assetRefs: [] as GeneratorAssetRef[],
  }),
};

export function createQuestProgressionRegistry() {
  return new CommonGeneratorRegistry().register(questProgressionGeneratorPlugin);
}
