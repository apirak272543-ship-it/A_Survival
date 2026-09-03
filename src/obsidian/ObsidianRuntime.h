#ifndef A_SURVIVAL_OBSIDIAN_RUNTIME_H
#define A_SURVIVAL_OBSIDIAN_RUNTIME_H

#include <string>

namespace ObsidianRuntime {

// Stable identity for the A_Survival runtime. UI and save names must not
// become the source of truth for this value.
static const char* const RUNTIME_MAP_ID = "obsidian-frontier";

// Returns true only for the canonical runtime identity. Callers that receive
// external map metadata should fail closed when this returns false.
bool acceptsMapId(const std::string& mapId);

// Produces a deterministic storage namespace for a user-created world while
// retaining the single Obsidian runtime identity.
std::string storageNamespace(const std::string& levelId);

} // namespace ObsidianRuntime

#endif
