#include "obsidian/PlantRegistry.h"

#include <cassert>
#include <cstddef>

int main()
{
    std::size_t count = 0;
    const ObsidianRuntime::PlantDefinition* definitions =
        ObsidianRuntime::plantDefinitions(count);

    assert(definitions != NULL);
    assert(count >= 4);
    for (std::size_t i = 0; i < count; ++i)
        assert(ObsidianRuntime::isValidPlantDefinition(definitions[i]));

    assert(ObsidianRuntime::findPlantDefinition("wheat") != NULL);
    assert(ObsidianRuntime::findPlantDefinition("obsidian_bloom") != NULL);
    assert(ObsidianRuntime::findPlantDefinition("missing") == NULL);
    assert(ObsidianRuntime::findPlantDefinition(NULL) == NULL);
    return 0;
}
