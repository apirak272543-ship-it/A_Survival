#ifndef A_SURVIVAL_OBSIDIAN_PROGRESSION_STATE_H
#define A_SURVIVAL_OBSIDIAN_PROGRESSION_STATE_H

#include <cstddef>
#include <vector>

#include "CodexRegistry.h"
#include "QuestProgression.h"

namespace ObsidianRuntime {

class ProgressionState {
public:
    ProgressionState();

    void reset();

    // Returns true only when this call completes the quest for the first time.
    bool advanceQuest(const char* questId, int amount = 1);
    int questProgress(const char* questId) const;
    bool isQuestComplete(const char* questId) const;

    int highestCompletedMap() const;
    bool isMapUnlocked(int mapId) const;

    // Discovery is idempotent and never rebuilds the immutable codex table.
    bool discoverCodex(const char* entryId);
    bool isCodexDiscovered(const char* entryId) const;

    std::size_t questCount() const;
    std::size_t codexCount() const;

private:
    std::vector<int> questProgress_;
    std::vector<bool> codexDiscovered_;
};

} // namespace ObsidianRuntime

#endif
