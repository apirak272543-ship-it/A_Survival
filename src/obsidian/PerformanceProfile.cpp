#include "PerformanceProfile.h"

namespace ObsidianRuntime {

PerformanceProfile performanceProfile(PerformanceTier tier)
{
    switch (tier) {
    case PERFORMANCE_LOW:
        return PerformanceProfile{6, 4, 8, 8, 6};
    case PERFORMANCE_HIGH:
        return PerformanceProfile{16, 12, 32, 24, 16};
    case PERFORMANCE_BALANCED:
    default:
        return PerformanceProfile{10, 8, 16, 12, 10};
    }
}

} // namespace ObsidianRuntime
