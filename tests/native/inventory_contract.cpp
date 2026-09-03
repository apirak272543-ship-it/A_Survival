#include "world/entity/player/Inventory.h"
#include "world/inventory/FillingContainer.h"

static_assert(Inventory::INVENTORY_SIZE == 40, "A_Survival inventory must have 40 total slots");
static_assert(Inventory::MAX_SELECTION_SIZE == 9, "Hotbar selection contract changed unexpectedly");
static_assert(FillingContainer::MAX_INVENTORY_STACK_SIZE == 64, "A_Survival stack cap must be 64");

int main()
{
    return (Inventory::INVENTORY_SIZE == 40 &&
            FillingContainer::MAX_INVENTORY_STACK_SIZE == 64) ? 0 : 1;
}
