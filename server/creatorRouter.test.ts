import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { solidRgba, type TexturePackInput } from "./generators/texturePackBuilder";

type UserRole = NonNullable<TrpcContext["user"]>["role"];

function createContext(role: UserRole | null): TrpcContext {
  return {
    user: role ? {
      id: role === "admin" ? 2 : 1,
      openId: `${role}-creator-test`,
      email: `${role}@example.com`,
      name: role === "admin" ? "Creator Admin" : "Regular User",
      loginMethod: "manus",
      role,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      lastSignedIn: new Date(0),
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function validCompositionInput() {
  return {
    templateId: "fern-icon",
    subject: "item" as const,
    canvasWidth: 4,
    canvasHeight: 4,
    layers: [{ id: "base", label: "พื้นฐาน", role: "base" as const, zIndex: 0, visible: true, opacity: 1 }],
    parts: [{ id: "body", label: "ส่วนหลัก", slot: "body" as const, x: 0, y: 0, width: 4, height: 4, layerIds: ["base"] }],
    palette: [{ id: "leaf-green", label: "เขียวใบไม้", hex: "#3f8f5b", semantic: "ใบไม้" }],
    pixels: [{ x: 2, y: 1, colorId: "leaf-green" }],
  };
}

function validTextureInput(): TexturePackInput {
  return {
    id: "creator-test-pack",
    namespace: "creator",
    version: "0.1.0",
    displayName: "Creator Test Pack",
    textureSampling: "nearest",
    assets: [{
      assetId: "fern-icon",
      kind: "icon",
      width: 2,
      height: 2,
      layers: [{ id: "base", x: 0, y: 0, width: 2, height: 2, rgba: solidRgba(2, 2, [80, 220, 140, 255]) }],
      source: "generated",
      provenanceRef: "creator-router-test",
    }],
  };
}

describe("creator texture router", () => {
  it("allows admin creators to build server-side PNG output and manifest", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.texture.build(validTextureInput());

    expect(result.validation).toEqual({ valid: true, issues: [] });
    expect(result.output.manifest.entries["fern-icon"]?.mime).toBe("image/png");
    expect(result.output.assets[0]?.pngBase64.startsWith("iVBORw0KGgo")).toBe(true);
    expect(result.output.assets[0]?.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("previews composition output through the texture builder without auto-registering it", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.composition.texturePreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });

    expect(result).toMatchObject({ previewOnly: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false }, registerRequiresSeparateAction: true, reviewRequired: true, validation: { valid: true, issues: [] } });
    expect(result.compositionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.output.assets[0]?.pngBase64.startsWith("iVBORw0KGgo")).toBe(true);
    expect(result.output.assets[0]?.provenanceRef).toContain("composition-sha256=");
  });

  it("keeps generator writes out of regular player users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.creator.texture.build(validTextureInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.register(validTextureInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.texturePreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps unauthenticated creator writes blocked", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.creator.texture.generate({ input: validTextureInput(), seed: "creator-seed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("returns stable generator output for the same seed and input", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const input = { input: validTextureInput(), seed: "creator-seed" };
    const first = await caller.creator.texture.generate(input);
    const second = await caller.creator.texture.generate(input);

    expect(second.artifact.contentHash).toBe(first.artifact.contentHash);
    expect(second.artifact.output).toEqual(first.artifact.output);
    expect(first.preview).toMatchObject({ generatorId: "texture.pack", kind: "texture", recordCount: 1 });
  });

  it("exposes deterministic no-code previews without importing them into the player runtime", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const world = await caller.creator.world.preview({ seed: 9107, radius: 8, difficulty: "normal" });
    const quest = await caller.creator.quest.preview({ mapCount: 3, seed: "story-preview" });
    const animation = await caller.creator.animation.preview({ id: "survivor.default", displayName: "Survivor Default Motion", assetId: "animation.survivor.default", assetSource: "starter-authored", provenanceRef: "procedural-starter-authored", seed: "animation-preview" });
    const block = await caller.creator.block.preview({ blockId: "terrain.obsidian" });
    const structure = await caller.creator.structure.preview({ mapId: "obsidian-frontier", blueprintId: "object-frontier-lantern", seed: "creator-structure", minPlacementScore: 0 });
    const item = await caller.creator.item.preview({
      id: "obsidian-field-tool",
      name: "เครื่องมือภาคสนามออบซิเดียน",
      family: "tool",
      role: "farmer",
      progression: "early",
      element: "neutral",
      materialTag: "obsidian",
      environmentTag: "obsidian-frontier",
      purpose: "ใช้เตรียมพื้นที่และดูแลแปลงปลูก",
      identity: "เครื่องมือที่อ่านสภาพดินได้ง่าย",
      weakness: "ไม่เหมาะกับการต่อสู้ระยะประชิดหนัก ๆ",
    });
    const weapon = await caller.creator.weapon.preview({ seed: 829173, count: 2, category: "melee", rarity: "common" });

    expect(world).toMatchObject({ previewOnly: true, mapId: "obsidian-frontier", metadata: { playerFacingWorldGenerationUi: false } });
    expect(world.counts.blocks).toBeGreaterThan(0);
    expect(quest).toMatchObject({ previewOnly: true, summary: { mapCount: 3, questsPerMap: 20, totalQuests: 60, playableMap: "obsidian-frontier", futureMapRuntimeImportAllowed: false, nextMapGateQuestCount: 20 } });
    expect(quest.summary.questSample).toHaveLength(20);
    expect(animation).toMatchObject({ previewOnly: true, output: { schemaVersion: "a-survival.animation-profile.v1", id: "survivor.default", states: { idle: { loop: true }, dead: { visible: false, loop: false } } } });
    expect(animation.preview.assetRefs).toEqual([{ assetId: "animation.survivor.default", kind: "animation", source: "starter-authored", provenanceRef: "procedural-starter-authored" }]);
    expect(block).toMatchObject({ previewOnly: true, runtimeImportAllowed: false, definition: { id: "terrain.obsidian", kind: "terrain", assetId: "terrain.obsidian" } });
    expect(structure.previewOnly).toBe(true);
    expect(structure.output.schemaVersion).toBe("a-survival.structure-generation.v1");
    expect(item.previewOnly).toBe(true);
    expect(item.output.definition.id).toBe("obsidian-field-tool");
    expect(item.validation).toEqual({ valid: true, issues: [] });
    expect(weapon.previewOnly).toBe(true);
    expect(weapon.records).toHaveLength(2);
    expect(weapon.records[0]!.kind).toBe("weapon");
  });

  it("keeps every new no-code preview endpoint admin-only", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.creator.world.preview({ seed: 1, radius: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.quest.preview({ mapCount: 3, seed: "blocked" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.animation.preview({ id: "blocked.animation", displayName: "Blocked Animation", assetId: "animation.blocked", assetSource: "reference-only", provenanceRef: "blocked-test", seed: "blocked" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.block.preview({ blockId: "terrain.obsidian" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.structure.preview({ mapId: "obsidian-frontier", blueprintId: "object-frontier-lantern", seed: "blocked" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.item.preview({
      id: "blocked-tool",
      name: "Blocked Tool",
      family: "tool",
      role: "farmer",
      progression: "early",
      element: "neutral",
      materialTag: "stone",
      environmentTag: "obsidian-frontier",
      purpose: "A blocked preview",
      identity: "A blocked preview",
      weakness: "A blocked preview",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.weapon.preview({ seed: 1, count: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.texturePreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
