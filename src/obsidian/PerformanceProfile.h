#ifndef A_SURVIVAL_OBSIDIAN_PERFORMANCE_PROFILE_H
#define A_SURVIVAL_OBSIDIAN_PERFORMANCE_PROFILE_H

namespace ObsidianRuntime {

enum PerformanceTier {
    PERFORMANCE_LOW = 0,
    PERFORMANCE_BALANCED = 1,
    PERFORMANCE_HIGH = 2
};

struct PerformanceProfile {
    int renderDistance;
    int chunkDistance;
    int mobSimulationDistance;
    int animationDistance;
    int physicsDistance;
};

PerformanceProfile performanceProfile(PerformanceTier tier);

} // namespace ObsidianRuntime

#endif
