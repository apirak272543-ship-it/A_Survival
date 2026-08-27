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

  it("keeps generator writes out of regular player users", async () => {
    const caller = appRouter.createCaller(createContext("user"));

    await expect(caller.creator.texture.build(validTextureInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.creator.texture.register(validTextureInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
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
});
