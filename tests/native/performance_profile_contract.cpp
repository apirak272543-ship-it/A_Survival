#include "obsidian/PerformanceProfile.h"

#include <cassert>

int main()
{
    const ObsidianRuntime::PerformanceProfile low =
        ObsidianRuntime::performanceProfile(ObsidianRuntime::PERFORMANCE_LOW);
    const ObsidianRuntime::PerformanceProfile balanced =
        ObsidianRuntime::performanceProfile(ObsidianRuntime::PERFORMANCE_BALANCED);
    const ObsidianRuntime::PerformanceProfile high =
        ObsidianRuntime::performanceProfile(ObsidianRuntime::PERFORMANCE_HIGH);

    assert(low.renderDistance < balanced.renderDistance);
    assert(balanced.renderDistance < high.renderDistance);
    assert(low.mobSimulationDistance < high.mobSimulationDistance);
    assert(low.physicsDistance < high.physicsDistance);
    return 0;
}
