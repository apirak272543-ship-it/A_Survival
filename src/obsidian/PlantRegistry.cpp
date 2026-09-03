#include "PlantRegistry.h"

#include <cstring>

namespace ObsidianRuntime {
namespace {

// Starter registry for the native vertical slice. New content should be
// appended as data entries, not generated from the render/update loop.
const PlantDefinition kPlantDefinitions[] = {
    {"wheat", 7, 1},
    {"melon", 7, 2},
    {"emberroot", 5, 3},
    {"obsidian_bloom", 6, 4}
};

const std::size_t kPlantDefinitionCount =
    sizeof(kPlantDefinitions) / sizeof(kPlantDefinitions[0]);

} // namespace

const PlantDefinition* plantDefinitions(std::size_t& count)
{
    count = kPlantDefinitionCount;
    return kPlantDefinitions;
}

const PlantDefinition* findPlantDefinition(const char* id)
{
    if (id == NULL || id[0] == '\0')
        return NULL;

    for (std::size_t i = 0; i < kPlantDefinitionCount; ++i) {
        if (std::strcmp(kPlantDefinitions[i].id, id) == 0)
            return &kPlantDefinitions[i];
    }
    return NULL;
}

bool isValidPlantDefinition(const PlantDefinition& definition)
{
    return definition.id != NULL && definition.id[0] != '\0' &&
           definition.maxStage > 0 && definition.maxStage <= 16 &&
           definition.effectCode >= 0;
}

} // namespace ObsidianRuntime
