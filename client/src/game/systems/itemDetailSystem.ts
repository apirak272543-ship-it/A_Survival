import { TIER_RULES, type ItemDefinition, type ItemInstance } from "@/game/data/catalog";

export const ITEM_DETAIL_HOLD_MS = 3500;

export type ItemShortDetail = {
  definitionId: string;
  title: string;
  category: string;
  tier: string;
  summary: string;
};

export type ItemLongDetail = ItemShortDetail & {
  effect: string;
  stackLimit: number;
  tags: string[];
  provenanceType: string;
  provenanceEventId: string;
  enhancement: number;
  placeableBlockId?: string;
};

export function getItemShortDetail(definition: ItemDefinition): ItemShortDetail {
  const tier = TIER_RULES[definition.tier];
  return {
    definitionId: definition.id,
    title: definition.name,
    category: definition.category,
    tier: tier.label,
    summary: definition.effect,
  };
}

export function getItemLongDetail(definition: ItemDefinition, instance: ItemInstance): ItemLongDetail {
  return {
    ...getItemShortDetail(definition),
    effect: definition.effect,
    stackLimit: definition.stackLimit,
    tags: definition.tags,
    provenanceType: instance.provenance.type,
    provenanceEventId: instance.provenance.eventId,
    enhancement: instance.enhancement,
    ...(definition.placementBlockId ? { placeableBlockId: definition.placementBlockId } : {}),
  };
}
