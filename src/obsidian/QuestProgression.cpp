#include "QuestProgression.h"

#include <cstring>

namespace ObsidianRuntime {
namespace {

const QuestDefinition kQuestDefinitions[] = {
    {"frontier_arrival", 1, QUEST_GATHER, 8, 101},
    {"first_green", 1, QUEST_HARVEST, 3, 102},
    {"break_the_silence", 1, QUEST_DEFEAT, 1, 103},
    {"gatewardens_trial", 2, QUEST_GATHER, 12, 201}
};

const std::size_t kQuestDefinitionCount =
    sizeof(kQuestDefinitions) / sizeof(kQuestDefinitions[0]);

} // namespace

const QuestDefinition* questDefinitions(std::size_t& count)
{
    count = kQuestDefinitionCount;
    return kQuestDefinitions;
}

const QuestDefinition* findQuestDefinition(const char* id)
{
    if (id == NULL || id[0] == '\0')
        return NULL;

    for (std::size_t i = 0; i < kQuestDefinitionCount; ++i) {
        if (std::strcmp(kQuestDefinitions[i].id, id) == 0)
            return &kQuestDefinitions[i];
    }
    return NULL;
}

bool isValidQuestDefinition(const QuestDefinition& definition)
{
    return definition.id != NULL && definition.id[0] != '\0' &&
           definition.mapId >= 1 && definition.targetCount > 0 &&
           definition.rewardCode > 0;
}

bool isMapUnlocked(int mapId, int highestCompletedMap)
{
    if (mapId < 1 || highestCompletedMap < 0)
        return false;
    return mapId <= highestCompletedMap + 1;
}

} // namespace ObsidianRuntime
