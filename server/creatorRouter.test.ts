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
    pixels: [{ x: 2, y: 1, colorId: "leaf-green", layerId: "base" }],
  };
}

function validDependencyGraphInput() {
  return {
    nodes: [
      { key: "world.obsidian", kind: "world" as const, generatorId: "world.generator", generatorVersion: "1.0.0", schemaVersion: "a-survival.world.v1", seed: "master-spec-seed", rulesVersion: "rules.v1", contentHash: "a".repeat(64), dependencies: [] },
      { key: "item.obsidian-tool", kind: "item" as const, generatorId: "item.generator", generatorVersion: "1.0.0", schemaVersion: "a-survival.item.v1", seed: "master-spec-seed", rulesVersion: "rules.v1", contentHash: "b".repeat(64), dependencies: [{ key: "world.obsidian", kind: "world" as const, required: true, generatorId: "world.generator", generatorVersion: "1.0.0", contentHash: "a".repeat(64) }] },
    ],
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

  it("previews a validated dependency graph without registering or importing it", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.preview(validDependencyGraphInput());

    expect(result).toMatchObject({ previewOnly: true, graph: { schemaVersion: "a-survival.dependency-graph.v1", valid: true, topologicalOrder: ["world.obsidian", "item.obsidian-tool"], runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } } });
    expect(result.graph.issues).toEqual([]);
    expect(result.graph.edges).toEqual([{ from: "world.obsidian", to: "item.obsidian-tool", required: true }]);
  });

  it("previews dependency nodes derived from the real content catalog artifact", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.contentCatalogPreview({ seed: "catalog-router-seed", samplePerCategory: 1 });

    expect(result).toMatchObject({ previewOnly: true, artifact: { generatorId: "content.catalog", generatorVersion: "1.0.0", seed: "catalog-router-seed", definitionCount: 3000, categoryCount: 10 }, graph: { schemaVersion: "a-survival.dependency-graph.v1", valid: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } } });
    expect(result.graph.nodes).toHaveLength(21);
    expect(result.graph.nodes.some(node => node.key.startsWith("content-catalog:"))).toBe(true);
    expect(result.graph.nodes.some(node => node.key === "content:weapon-sword-001")).toBe(true);
  });

  it("previews quest references against the real content catalog without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.questContentCatalogPreview({ seed: "quest-router-seed", mapCount: 3, sampleQuestCount: 8 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ generatorId: "quest.progression", seed: "quest-router-seed", mapCount: 3, questCount: 60 });
    expect(result.summary).toMatchObject({ sampledQuestCount: 8, futureMapNodeCount: 2 });
    expect(result.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews universal item references against the real content catalog without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.itemContentCatalogPreview({ seed: "item-catalog-router-seed", itemId: "obsidian-rift-blade", samplePerCategory: 1, maxPowerBudget: 100 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ generatorId: "item.universal", generatorVersion: "1.0.0", seed: "item-catalog-router-seed", itemId: "obsidian-rift-blade", category: "weapon-sword" });
    expect(result.summary.balanceScore).toBeLessThanOrEqual(100);
    expect(result.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews real structure blocks against content catalog definitions without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.structureBlockContentCatalogPreview({ seed: "world-structure-seed", radius: 32, blueprintIds: ["compound-frontier-farm", "object-frontier-lantern"], sampleBlockCount: 24, samplePerCategory: 8 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", structureGeneratorVersion: "1.0.0", catalogGeneratorVersion: "1.0.0", sampledBlockCount: 24 });
    expect(result.summary.structureCount).toBeGreaterThan(0);
    expect(result.summary.sampledBlockCount).toBeGreaterThan(0);
    expect(result.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews real world blocks against content catalog definitions without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.worldBlockContentCatalogPreview({ seed: "world-structure-seed", radius: 32, sampleBlockCount: 24, samplePerCategory: 8 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", catalogGeneratorVersion: "1.0.0", sampledBlockCount: 24 });
    expect(result.summary.worldBlockCount).toBeGreaterThan(0);
    expect(result.summary.sampledBlockCount).toBe(24);
    expect(result.summary.resourceDefinitionIds).toContain("ore.aether.block");
    expect(result.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews real Obsidian biome and resource references against content catalog without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.worldBiomeResourceContentCatalogPreview({ seed: "world-structure-seed", radius: 32, sampleResourceCount: 16, samplePerCategory: 8 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", catalogGeneratorVersion: "1.0.0", sampledResourceCount: 16 });
    expect(result.summary.biomeIds.length).toBeGreaterThan(1);
    expect(result.summary.resourceCount).toBeGreaterThan(0);
    expect(result.summary.sampledResourceCount).toBe(16);
    expect(result.summary.resourceDefinitionIds).toContain("ore.aether.block");
    expect(result.summary.unresolvedReferenceCount).toBeGreaterThan(0);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews procedural weapon artifacts against content catalog without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.proceduralContentCatalogPreview({ seed: "procedural-catalog-seed", count: 8, category: "melee", samplePerCategory: 8 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ generatorId: "content.generator", generatorVersion: "0.1.0", seed: "procedural-catalog-seed", weaponCount: 8, category: "melee" });
    expect(result.summary.weaponCount).toBe(8);
    expect(result.summary.catalogCategoryIds).toContain("weapon-sword");
    expect(result.summary.unresolvedReferenceTypes["catalog-definition"]).toBe(8);
    expect(result.summary.unresolvedReferenceTypes["asset-binding"]).toBe(8);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews real Obsidian spawn points with procedural loot without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.worldSpawnLootPreview({ seed: "world-structure-seed", radius: 32, sampleSpawnCount: 16 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0", lootGeneratorVersion: "0.1.0" });
    expect(result.summary.sampledSpawnCount).toBeLessThanOrEqual(16);
    expect(result.summary.lootCount).toBeGreaterThan(0);
    expect(result.summary.dropCount).toBeGreaterThan(result.summary.lootCount);
    expect(result.summary.unresolvedReferenceTypes["asset-binding"]).toBe(result.summary.dropCount);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews real Obsidian spawn points with biome and structure context without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.worldSpawnPreview({ seed: "world-structure-seed", radius: 32, sampleSpawnCount: 16 });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-seed", worldGeneratorVersion: "0.1.0" });
    expect(result.summary.spawnCount).toBeGreaterThan(0);
    expect(result.summary.sampledSpawnCount).toBeLessThanOrEqual(16);
    expect(result.summary.biomeIds.length).toBeGreaterThan(1);
    expect(result.summary.structureIds.length).toBeGreaterThan(0);
    expect(result.summary.structureLinkedSpawnCount).toBeGreaterThan(0);
    expect(result.summary.unresolvedReferenceTypes["species-definition"]).toBe(result.summary.sampledSpawnCount);
    expect(result.graph.valid).toBe(false);
    expect(result.graph.issues.some(issue => issue.code === "MISSING_REQUIRED_DEPENDENCY")).toBe(true);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("previews the real Obsidian world against structure blueprints without runtime import", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.dependencyGraph.worldStructurePreview({ seed: "world-structure-router-seed", radius: 32, blueprintIds: ["object-frontier-lantern"] });

    expect(result.previewOnly).toBe(true);
    expect(result.artifact).toMatchObject({ mapId: "obsidian-frontier", seed: "world-structure-router-seed", blueprintCount: 1, worldGeneratorVersion: "0.1.0", structureGeneratorVersion: "1.0.0" });
    expect(result.summary.futureMapCount).toBe(0);
    expect(result.summary.worldBlocks).toBeGreaterThan(0);
    expect(result.graph.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
    expect(result.graph.nodes.some(node => node.key.startsWith("world:obsidian-frontier:"))).toBe(true);
    expect(result.graph.nodes.some(node => node.key.startsWith("structure-placement:"))).toBe(true);
  });

  it("previews composition output through the texture builder without auto-registering it", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.composition.texturePreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });

    expect(result).toMatchObject({ previewOnly: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false }, registerRequiresSeparateAction: true, reviewRequired: true, validation: { valid: true, issues: [] } });
    expect(result.compositionHash).toMatch(/^[a-f0-9]{64}$/);
    expect(result.output.assets[0]?.pngBase64.startsWith("iVBORw0KGgo")).toBe(true);
    expect(result.output.assets[0]?.provenanceRef).toContain("composition-sha256=");
  });

  it("exports a validated composition PNG bundle only through a separate admin action", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.composition.exportPreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });

    expect(result).toMatchObject({ exportSchemaVersion: "a-survival.creator-composition-texture-export.v1", previewOnly: true, downloadable: true, registerRequiresSeparateAction: true, reviewRequired: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } });
    expect(result.exportId).toMatch(/^[a-f0-9]{64}$/);
    expect(result.packSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(result.assets[0]?.pngBase64.startsWith("iVBORw0KGgo")).toBe(true);
    expect(result.assets[0]?.downloadFileName).toBe("fern-icon.png");
    expect(result.assets[0]?.provenanceRef).toContain("composition-sha256=");
  });

  it("validates composition PNG, manifest and ZIP bytes only through a separate admin action", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const result = await caller.creator.composition.byteCompatibility({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "procedural-starter-authored", textureSampling: "nearest" });

    expect(result).toMatchObject({ schemaVersion: "a-survival.creator-composition-texture-compatibility.v1", decision: "compatible", previewOnly: true, runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } });
    expect(result.checkedFiles).toContain("manifest.json");
    expect(result.checkedFiles.some(file => file.endsWith(".png"))).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it("keeps generator writes out of regular player users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.creator.texture.build(validTextureInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.register(validTextureInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.texturePreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.exportPreview({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.byteCompatibility({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.register({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.preview(validDependencyGraphInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.contentCatalogPreview({ seed: "blocked-seed", samplePerCategory: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.questContentCatalogPreview({ seed: "blocked-seed", mapCount: 1, sampleQuestCount: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldStructurePreview({ seed: "blocked-seed", radius: 32, blueprintIds: ["object-frontier-lantern"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.itemContentCatalogPreview({ seed: "blocked-seed", itemId: "obsidian-rift-blade", samplePerCategory: 1, maxPowerBudget: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldBlockContentCatalogPreview({ seed: "blocked-seed", radius: 32, sampleBlockCount: 24, samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.structureBlockContentCatalogPreview({ seed: "blocked-seed", radius: 32, blueprintIds: ["object-frontier-lantern"], sampleBlockCount: 24, samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldBiomeResourceContentCatalogPreview({ seed: "blocked-seed", radius: 32, sampleResourceCount: 16, samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldSpawnPreview({ seed: "blocked-seed", radius: 32, sampleSpawnCount: 16 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldSpawnLootPreview({ seed: "blocked-seed", radius: 32, sampleSpawnCount: 16 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.proceduralContentCatalogPreview({ seed: "blocked-seed", count: 8, category: "melee", samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("keeps unauthenticated creator writes blocked", async () => {
    const caller = appRouter.createCaller(createContext(null));

    await expect(caller.creator.texture.generate({ input: validTextureInput(), seed: "creator-seed" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.composition.register({ ...validCompositionInput(), source: "starter-authored", provenanceRef: "blocked", textureSampling: "nearest" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.review({ artifactKey: "texture-pack:blocked:0.1.0:hash", action: "approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.list({ limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.preview(validDependencyGraphInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.contentCatalogPreview({ seed: "blocked-seed", samplePerCategory: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.questContentCatalogPreview({ seed: "blocked-seed", mapCount: 1, sampleQuestCount: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldStructurePreview({ seed: "blocked-seed", radius: 32, blueprintIds: ["object-frontier-lantern"] })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.itemContentCatalogPreview({ seed: "blocked-seed", itemId: "obsidian-rift-blade", samplePerCategory: 1, maxPowerBudget: 100 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldBlockContentCatalogPreview({ seed: "blocked-seed", radius: 32, sampleBlockCount: 24, samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.structureBlockContentCatalogPreview({ seed: "blocked-seed", radius: 32, blueprintIds: ["object-frontier-lantern"], sampleBlockCount: 24, samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldBiomeResourceContentCatalogPreview({ seed: "blocked-seed", radius: 32, sampleResourceCount: 16, samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldSpawnPreview({ seed: "blocked-seed", radius: 32, sampleSpawnCount: 16 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.worldSpawnLootPreview({ seed: "blocked-seed", radius: 32, sampleSpawnCount: 16 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.dependencyGraph.proceduralContentCatalogPreview({ seed: "blocked-seed", count: 8, category: "melee", samplePerCategory: 8 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports a clear durable registry-unavailable error after admin preflight when DB is not configured", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const input = { ...validCompositionInput(), source: "starter-authored" as const, provenanceRef: "procedural-starter-authored", textureSampling: "nearest" as const };

    await expect(caller.creator.composition.register(input)).rejects.toMatchObject({
      message: "Creator artifact registry requires DATABASE_URL and configured object storage",
    });
  });

  it("keeps texture review listing unavailable until durable registry services are configured", async () => {
    const caller = appRouter.createCaller(createContext("admin"));
    const unavailable = { message: "Creator artifact registry requires DATABASE_URL and configured object storage" };

    await expect(caller.creator.texture.list({ limit: 20 })).rejects.toMatchObject(unavailable);
    await expect(caller.creator.texture.review({ artifactKey: "texture-pack:missing:0.1.0:hash", action: "approve" })).rejects.toMatchObject(unavailable);
    await expect(caller.creator.texture.audit({ artifactKey: "texture-pack:missing:0.1.0:hash", limit: 20 })).rejects.toMatchObject(unavailable);
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
    await expect(caller.creator.texture.review({ artifactKey: "texture-pack:blocked:0.1.0:hash", action: "approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.audit({ artifactKey: "texture-pack:blocked:0.1.0:hash", limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.list({ limit: 20 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
