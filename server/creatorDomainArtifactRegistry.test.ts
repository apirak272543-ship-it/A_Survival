import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { buildCreatorDomainArtifactMetadata, makeCreatorDomainArtifactKey } from "./creatorDomainArtifactRegistry";

type UserRole = NonNullable<TrpcContext["user"]>["role"];

function createContext(role: UserRole | null): TrpcContext {
  return {
    user: role ? {
      id: role === "admin" ? 2 : 1,
      openId: `${role}-domain-artifact-test`,
      email: `${role}-domain-artifact@example.com`,
      name: role === "admin" ? "Creator Admin" : "Regular User",
      loginMethod: "test",
      role,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      lastSignedIn: new Date(0),
    } : null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function buildInput() {
  return {
    domain: "animation" as const,
    artifactId: "survivor.default",
    artifactVersion: "0.1.0",
    generatorId: "animation.profile",
    generatorVersion: "1.0.0",
    manifest: { states: ["idle", "walk", "dead"], assetId: "animation.survivor.default" },
    summary: { stateCount: 3, fps: 12 },
    sources: ["starter-authored", "starter-authored"],
    provenanceRefs: ["procedural-starter-authored"],
  };
}

describe("creator domain artifact registry", () => {
  it("canonicalizes metadata and creates a stable content hash/key", () => {
    const first = buildCreatorDomainArtifactMetadata(buildInput());
    const reordered = buildCreatorDomainArtifactMetadata({
      ...buildInput(),
      manifest: { assetId: "animation.survivor.default", states: ["idle", "walk", "dead"] },
      summary: { fps: 12, stateCount: 3 },
    });

    expect(first.contentSha256).toMatch(/^[a-f0-9]{64}$/);
    expect(first.contentSha256).toBe(reordered.contentSha256);
    expect(first.artifactKey).toBe(makeCreatorDomainArtifactKey(first));
    expect(first.provenance.sources).toEqual(["starter-authored"]);
    expect(first.runtimePolicy).toEqual({ runtimeImportAllowed: false, playerVisible: false, cacheable: false });
  });

  it("rejects binary-like payload fields and keeps runtime import disabled", () => {
    expect(() => buildCreatorDomainArtifactMetadata({ ...buildInput(), summary: { pngBase64: "not-a-runtime-asset" } })).toThrow("binary payload");
    const metadata = buildCreatorDomainArtifactMetadata(buildInput());
    expect(metadata.provenance.usage).toContain("not automatically imported");
    expect(metadata.manifest).not.toHaveProperty("pngBase64");
  });

  it("exposes admin-only preview while blocking regular users before DB access", async () => {
    const admin = appRouter.createCaller(createContext("admin"));
    const user = appRouter.createCaller(createContext("user"));
    const preview = await admin.creator.artifact.preview(buildInput());

    expect(preview).toMatchObject({ previewOnly: true, domain: "animation", runtimePolicy: { runtimeImportAllowed: false, playerVisible: false, cacheable: false } });
    await expect(user.creator.artifact.preview(buildInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(user.creator.artifact.register(buildInput())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(user.creator.artifact.list({ domain: "animation" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
