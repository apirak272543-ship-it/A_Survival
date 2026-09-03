#include "ObsidianRuntime.h"

namespace ObsidianRuntime {

bool acceptsMapId(const std::string& mapId)
{
    return mapId == RUNTIME_MAP_ID;
}

std::string storageNamespace(const std::string& levelId)
{
    if (levelId.empty())
        return std::string(RUNTIME_MAP_ID);
    return std::string(RUNTIME_MAP_ID) + "/" + levelId;
}

} // namespace ObsidianRuntime
