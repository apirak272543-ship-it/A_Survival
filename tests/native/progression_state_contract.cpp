#include "obsidian/ProgressionState.h"

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
    return 0;
}
