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

    const ObsidianRuntime::PlantDefinition* wheat =
        ObsidianRuntime::findPlantDefinition("wheat");
    const ObsidianRuntime::PlantDefinition* emberroot =
        ObsidianRuntime::findPlantDefinition("emberroot");
    assert(wheat != NULL);
    assert(wheat->maxStage == 7);
    assert(emberroot != NULL);
    assert(emberroot->maxStage == 5);
    assert(ObsidianRuntime::findPlantDefinition("obsidian_bloom") != NULL);
    assert(ObsidianRuntime::findPlantDefinition("missing") == NULL);
    assert(ObsidianRuntime::findPlantDefinition(NULL) == NULL);
    return 0;
}
