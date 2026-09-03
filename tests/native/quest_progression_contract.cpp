#include "obsidian/QuestProgression.h"

#include <cassert>
#include <cstddef>

int main()
{
    std::size_t count = 0;
    const ObsidianRuntime::QuestDefinition* quests =
        ObsidianRuntime::questDefinitions(count);

    assert(quests != NULL);
    assert(count >= 4);
    for (std::size_t i = 0; i < count; ++i)
        assert(ObsidianRuntime::isValidQuestDefinition(quests[i]));

    assert(ObsidianRuntime::findQuestDefinition("frontier_arrival") != NULL);
    assert(ObsidianRuntime::findQuestDefinition("missing") == NULL);
    assert(ObsidianRuntime::findQuestDefinition(NULL) == NULL);

    assert(ObsidianRuntime::isMapUnlocked(1, 0));
    assert(ObsidianRuntime::isMapUnlocked(2, 1));
    assert(!ObsidianRuntime::isMapUnlocked(3, 1));
    assert(!ObsidianRuntime::isMapUnlocked(0, 0));
    return 0;
}
