#ifndef A_SURVIVAL_OBSIDIAN_CODEX_REGISTRY_H
#define A_SURVIVAL_OBSIDIAN_CODEX_REGISTRY_H

#include <cstddef>

namespace ObsidianRuntime {

struct CodexEntry {
    const char* id;
    const char* title;
    const char* shortDescription;
    const char* discoveredDescription;
};

const CodexEntry* codexEntries(std::size_t& count);
const CodexEntry* findCodexEntry(const char* id);
const char* codexDescription(const CodexEntry& entry, bool discovered);
bool isValidCodexEntry(const CodexEntry& entry);

} // namespace ObsidianRuntime

#endif
