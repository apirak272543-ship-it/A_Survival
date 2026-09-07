#include "ProgressionState.h"
#include "../nbt/CompoundTag.h"

#include <algorithm>
#include <cstring>

namespace ObsidianRuntime {

ProgressionState::ProgressionState()
{
    reset();
}

void ProgressionState::reset()
{
    std::size_t questTotal = 0;
    std::size_t codexTotal = 0;
    questDefinitions(questTotal);
    codexEntries(codexTotal);
    questProgress_.assign(questTotal, 0);
    codexDiscovered_.assign(codexTotal, false);
}

bool ProgressionState::advanceQuest(const char* questId, int amount)
{
    if (questId == NULL || amount <= 0)
        return false;

    std::size_t count = 0;
    const QuestDefinition* definitions = questDefinitions(count);
    for (std::size_t i = 0; i < count; ++i) {
        if (std::strcmp(definitions[i].id, questId) != 0)
            continue;

        const int before = questProgress_[i];
        const int after = std::min(definitions[i].targetCount, before + amount);
        questProgress_[i] = after;
        return before < definitions[i].targetCount &&
               after >= definitions[i].targetCount;
    }
    return false;
}

int ProgressionState::questProgress(const char* questId) const
{
    if (questId == NULL)
        return 0;

    std::size_t count = 0;
    const QuestDefinition* definitions = questDefinitions(count);
    for (std::size_t i = 0; i < count; ++i) {
        if (std::strcmp(definitions[i].id, questId) == 0)
            return questProgress_[i];
    }
    return 0;
}

bool ProgressionState::isQuestComplete(const char* questId) const
{
    if (questId == NULL)
        return false;

    std::size_t count = 0;
    const QuestDefinition* definitions = questDefinitions(count);
    for (std::size_t i = 0; i < count; ++i) {
        if (std::strcmp(definitions[i].id, questId) == 0)
            return questProgress_[i] >= definitions[i].targetCount;
    }
    return false;
}

int ProgressionState::highestCompletedMap() const
{
    std::size_t count = 0;
    const QuestDefinition* definitions = questDefinitions(count);
    int highest = 0;

    for (int mapId = 1; ; ++mapId) {
        bool hasQuest = false;
        bool complete = true;
        for (std::size_t i = 0; i < count; ++i) {
            if (definitions[i].mapId != mapId)
                continue;
            hasQuest = true;
            if (questProgress_[i] < definitions[i].targetCount)
                complete = false;
        }
        if (!hasQuest || !complete)
            break;
        highest = mapId;
    }
    return highest;
}

bool ProgressionState::isMapUnlocked(int mapId) const
{
    return ObsidianRuntime::isMapUnlocked(mapId, highestCompletedMap());
}

bool ProgressionState::discoverCodex(const char* entryId)
{
    if (entryId == NULL)
        return false;

    std::size_t count = 0;
    const CodexEntry* entries = codexEntries(count);
    for (std::size_t i = 0; i < count; ++i) {
        if (std::strcmp(entries[i].id, entryId) != 0)
            continue;
        const bool wasDiscovered = codexDiscovered_[i];
        codexDiscovered_[i] = true;
        return !wasDiscovered;
    }
    return false;
}

bool ProgressionState::isCodexDiscovered(const char* entryId) const
{
    if (entryId == NULL)
        return false;

    std::size_t count = 0;
    const CodexEntry* entries = codexEntries(count);
    for (std::size_t i = 0; i < count; ++i) {
        if (std::strcmp(entries[i].id, entryId) == 0)
            return codexDiscovered_[i];
    }
    return false;
}

std::size_t ProgressionState::questCount() const
{
    return questProgress_.size();
}

std::size_t ProgressionState::codexCount() const
{
    return codexDiscovered_.size();
}

void ProgressionState::saveToTag(CompoundTag* tag) const
{
    if (tag == NULL)
        return;

    tag->putInt("Version", 1);
    for (std::size_t i = 0; i < questProgress_.size(); ++i)
        tag->putInt("Quest_" + std::to_string(i), questProgress_[i]);
    for (std::size_t i = 0; i < codexDiscovered_.size(); ++i)
        tag->putBoolean("Codex_" + std::to_string(i), codexDiscovered_[i]);
}

void ProgressionState::loadFromTag(const CompoundTag* tag)
{
    reset();
    if (tag == NULL)
        return;

    std::size_t questTotal = 0;
    const QuestDefinition* definitions = questDefinitions(questTotal);
    for (std::size_t i = 0; i < questProgress_.size() && i < questTotal; ++i) {
        const std::string key = "Quest_" + std::to_string(i);
        const int value = tag->getInt(key);
        questProgress_[i] = std::max(0, std::min(definitions[i].targetCount, value));
    }
    for (std::size_t i = 0; i < codexDiscovered_.size(); ++i) {
        const std::string key = "Codex_" + std::to_string(i);
        codexDiscovered_[i] = tag->getBoolean(key);
    }
}

} // namespace ObsidianRuntime
