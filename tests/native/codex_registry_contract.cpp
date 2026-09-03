#include "obsidian/CodexRegistry.h"

#include <cassert>
#include <cstddef>
#include <cstring>

int main()
{
    std::size_t count = 0;
    const ObsidianRuntime::CodexEntry* entries =
        ObsidianRuntime::codexEntries(count);

    assert(entries != NULL);
    assert(count >= 3);
    for (std::size_t i = 0; i < count; ++i)
        assert(ObsidianRuntime::isValidCodexEntry(entries[i]));

    const ObsidianRuntime::CodexEntry* wheat =
        ObsidianRuntime::findCodexEntry("wheat");
    assert(wheat != NULL);
    assert(std::strcmp(ObsidianRuntime::codexDescription(*wheat, false),
                       wheat->shortDescription) == 0);
    assert(std::strcmp(ObsidianRuntime::codexDescription(*wheat, true),
                       wheat->discoveredDescription) == 0);
    assert(ObsidianRuntime::findCodexEntry("missing") == NULL);
    return 0;
}
