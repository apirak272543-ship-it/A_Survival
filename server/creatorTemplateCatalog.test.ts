import { describe, expect, it } from "vitest";
import { CREATOR_SKIN_LAYOUT_PARTS, CREATOR_SKIN_PARTS, CREATOR_TEMPLATE_PRESETS, getCompositionSubjectForTemplate, isWorkbenchCompositionTemplate } from "../client/src/lib/creatorTemplateCatalog";

describe("shared creator template catalog", () => {
  it("keeps stable unique template identities with bounded dimensions", () => {
    const ids = CREATOR_TEMPLATE_PRESETS.map(template => template.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).toEqual(["plant-icon", "weapon-icon", "item-icon", "terrain-tile", "character-skin", "survivor-pixel-32", "atlas-sheet"]);
    expect(CREATOR_TEMPLATE_PRESETS.every(template => template.width >= 1 && template.width <= 128 && template.height >= 1 && template.height <= 128)).toBe(true);
  });

  it("keeps the authoring kinds and the bounded survivor template explicit", () => {
    expect(new Set(CREATOR_TEMPLATE_PRESETS.map(template => template.kind))).toEqual(new Set(["icon", "tile", "skin", "atlas"]));
    expect(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "survivor-pixel-32")).toMatchObject({ kind: "skin", width: 32, height: 32 });
  });

  it("maps canonical kinds to composition subjects and filters the Workbench to its 32x32 display bound", () => {
    expect(getCompositionSubjectForTemplate(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "weapon-icon")!)).toBe("weapon");
    expect(getCompositionSubjectForTemplate(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "terrain-tile")!)).toBe("block");
    expect(getCompositionSubjectForTemplate(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "item-icon")!)).toBe("item");
    expect(getCompositionSubjectForTemplate(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "character-skin")!)).toBe("animation");
    expect(CREATOR_TEMPLATE_PRESETS.filter(isWorkbenchCompositionTemplate).map(template => template.id)).toEqual(["plant-icon", "weapon-icon", "item-icon", "terrain-tile", "survivor-pixel-32"]);
    expect(isWorkbenchCompositionTemplate(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "character-skin")!)).toBe(false);
    expect(isWorkbenchCompositionTemplate(CREATOR_TEMPLATE_PRESETS.find(template => template.id === "atlas-sheet")!)).toBe(false);
  });

  it("keeps every skin part represented in the 64x64 layout without triangles or binary payloads", () => {
    expect(CREATOR_SKIN_PARTS.map(part => part.id)).toEqual(Object.keys(CREATOR_SKIN_LAYOUT_PARTS));
    expect(Object.values(CREATOR_SKIN_LAYOUT_PARTS).every(part => part.x >= 0 && part.y >= 0 && part.x + part.width <= 64 && part.y + part.height <= 64)).toBe(true);
    expect(JSON.stringify(CREATOR_SKIN_LAYOUT_PARTS)).not.toMatch(/base64|bytes|vertices|indices|geometry/);
  });
});
