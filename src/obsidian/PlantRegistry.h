#ifndef A_SURVIVAL_OBSIDIAN_PLANT_REGISTRY_H
#define A_SURVIVAL_OBSIDIAN_PLANT_REGISTRY_H

#include <cstddef>

namespace ObsidianRuntime {

struct PlantDefinition {
    const char* id;
    int maxStage;
    int effectCode;
};

// Returns the immutable, preloaded definition table. The table is not rebuilt
// during world ticks or rendering.
const PlantDefinition* plantDefinitions(std::size_t& count);
const PlantDefinition* findPlantDefinition(const char* id);
bool isValidPlantDefinition(const PlantDefinition& definition);

} // namespace ObsidianRuntime

#endif
