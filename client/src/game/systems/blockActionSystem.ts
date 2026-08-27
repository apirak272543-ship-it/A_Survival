import { getBlockDefinition, type BlockToolTag, type WorldBlock } from "@/game/data/blockModules";

export type BlockDropKind = "none" | "material" | "block-item";

export type BlockBreakResult = {
  accepted: boolean;
  blockKey: string;
  blockId: string;
  action: "break" | "chop" | "harvest";
  removed: boolean;
  usedCorrectTool: boolean;
  dropKind: BlockDropKind;
  dropDefinitionId?: string;
  dropQuantity: number;
  message: string;
};

export function resolveBlockBreak(block: WorldBlock, toolTag?: BlockToolTag): BlockBreakResult {
  const definition = getBlockDefinition(block.blockId);
  if (!definition || block.state === "broken") {
    return {
      accepted: false,
      blockKey: block.key,
      blockId: block.blockId,
      action: definition?.action ?? "break",
      removed: false,
      usedCorrectTool: false,
      dropKind: "none",
      dropQuantity: 0,
      message: "บล็อกนี้ถูกทำลายไปแล้วหรือไม่พบคำจำกัดความ",
    };
  }

  const usedCorrectTool = definition.requiredToolTag === toolTag;
  if (usedCorrectTool && definition.blockItemDefinitionId) {
    return {
      accepted: true,
      blockKey: block.key,
      blockId: block.blockId,
      action: definition.action,
      removed: true,
      usedCorrectTool,
      dropKind: "block-item",
      dropDefinitionId: definition.blockItemDefinitionId,
      dropQuantity: definition.dropQuantity,
      message: "เครื่องมือถูกประเภท: ได้บล็อกกลับมาเพื่อวางสร้าง",
    };
  }

  return {
    accepted: true,
    blockKey: block.key,
    blockId: block.blockId,
    action: definition.action,
    removed: true,
    usedCorrectTool,
    dropKind: "none",
    dropQuantity: 0,
    message: "บล็อกถูกทำลาย แต่เครื่องมือไม่ตรงประเภทจึงไม่ได้บล็อกกลับมา",
  };
}
