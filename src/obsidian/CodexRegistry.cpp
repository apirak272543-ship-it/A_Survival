#include "CodexRegistry.h"

#include <cstring>

namespace ObsidianRuntime {
namespace {

const CodexEntry kCodexEntries[] = {
    {"wheat", "Wheat", "A hardy frontier crop.",
     "Wheat grows on hydrated farmland and restores a small amount of vitality."},
    {"emberroot", "Emberroot", "An unfamiliar red-root plant.",
     "Emberroot retains warmth from the deep soil and is valued near cold camps."},
    {"obsidian_bloom", "Obsidian Bloom", "A dark flower with a glassy edge.",
     "Obsidian Bloom appears where the frontier soil touches old volcanic stone."}
};

const std::size_t kCodexEntryCount =
    sizeof(kCodexEntries) / sizeof(kCodexEntries[0]);

} // namespace

const CodexEntry* codexEntries(std::size_t& count)
{
    count = kCodexEntryCount;
    return kCodexEntries;
}

const CodexEntry* findCodexEntry(const char* id)
{
    if (id == NULL || id[0] == '\0')
        return NULL;

    for (std::size_t i = 0; i < kCodexEntryCount; ++i) {
        if (std::strcmp(kCodexEntries[i].id, id) == 0)
            return &kCodexEntries[i];
    }
    return NULL;
}

const char* codexDescription(const CodexEntry& entry, bool discovered)
{
    if (discovered && entry.discoveredDescription != NULL &&
        entry.discoveredDescription[0] != '\0')
        return entry.discoveredDescription;
    return entry.shortDescription;
}

bool isValidCodexEntry(const CodexEntry& entry)
{
    return entry.id != NULL && entry.id[0] != '\0' &&
           entry.title != NULL && entry.title[0] != '\0' &&
           entry.shortDescription != NULL && entry.shortDescription[0] != '\0' &&
           entry.discoveredDescription != NULL && entry.discoveredDescription[0] != '\0';
}

} // namespace ObsidianRuntime
