#include "obsidian/ObsidianRuntime.h"

#include <cassert>

int main()
{
    assert(ObsidianRuntime::acceptsMapId("obsidian-frontier"));
    assert(!ObsidianRuntime::acceptsMapId(""));
    assert(!ObsidianRuntime::acceptsMapId("minecraft"));
    assert(ObsidianRuntime::storageNamespace("alpha") == "obsidian-frontier/alpha");
    assert(ObsidianRuntime::storageNamespace("") == "obsidian-frontier");
    return 0;
}
