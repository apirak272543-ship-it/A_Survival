#include "obsidian/ProgressionState.h"
#include "nbt/CompoundTag.h"

#include <cassert>

int main()
{
    ObsidianRuntime::ProgressionState state;
    assert(state.questCount() >= 4);
    assert(state.codexCount() > 0);
    assert(state.highestCompletedMap() == 0);
    assert(state.isMapUnlocked(1));
    assert(!state.isMapUnlocked(2));

    assert(!state.advanceQuest("frontier_arrival", 7));
    assert(state.questProgress("frontier_arrival") == 7);
    assert(state.advanceQuest("frontier_arrival", 1));
    assert(state.isQuestComplete("frontier_arrival"));
    assert(!state.advanceQuest("frontier_arrival", 1));

    assert(state.advanceQuest("first_green", 3));
    assert(state.advanceQuest("break_the_silence", 1));
    assert(state.highestCompletedMap() == 1);
    assert(state.isMapUnlocked(2));

    assert(state.discoverCodex("wheat"));
    assert(!state.discoverCodex("wheat"));
    assert(state.isCodexDiscovered("wheat"));
    assert(!state.isCodexDiscovered("missing"));

    CompoundTag saved;
    state.saveToTag(&saved);
    ObsidianRuntime::ProgressionState restored;
    restored.loadFromTag(&saved);
    assert(restored.isQuestComplete("frontier_arrival"));
    assert(restored.isQuestComplete("first_green"));
    assert(restored.isQuestComplete("break_the_silence"));
    assert(restored.isCodexDiscovered("wheat"));
    assert(restored.highestCompletedMap() == 1);
    return 0;
}
