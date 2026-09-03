#ifndef A_SURVIVAL_OBSIDIAN_QUEST_PROGRESSION_H
#define A_SURVIVAL_OBSIDIAN_QUEST_PROGRESSION_H

#include <cstddef>

namespace ObsidianRuntime {

enum QuestObjectiveType {
    QUEST_GATHER = 0,
    QUEST_HARVEST = 1,
    QUEST_DEFEAT = 2
};

struct QuestDefinition {
    const char* id;
    int mapId;
    QuestObjectiveType objective;
    int targetCount;
    int rewardCode;
};

const QuestDefinition* questDefinitions(std::size_t& count);
const QuestDefinition* findQuestDefinition(const char* id);
bool isValidQuestDefinition(const QuestDefinition& definition);
bool isMapUnlocked(int mapId, int highestCompletedMap);

} // namespace ObsidianRuntime

#endif
