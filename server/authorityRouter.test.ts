import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

function createContext(role: NonNullable<TrpcContext["user"]>["role"] | null): TrpcContext {
  return {
    user: role ? {
      id: role === "master" ? 1 : 2,
      openId: `${role}-authority-test`,
      email: `${role}@example.com`,
      name: role,
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

const validGraph = {
  nodes: [{
    key: "world.obsidian",
    kind: "world" as const,
    generatorId: "world.generator",
    generatorVersion: "1.0.0",
    schemaVersion: "a-survival.world.v1",
    seed: "authority-test",
    rulesVersion: "rules.v1",
    contentHash: "a".repeat(64),
    dependencies: [],
  }],
};

describe("authority router", () => {
  it.each(["user", "gm", "admin"] as const)("blocks %s from authority management", async role => {
    const caller = appRouter.createCaller(createContext(role));
    await expect(caller.auth.authority.policy()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.authority.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.authority.audit()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.authority.invitations()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.authority.invite({ email: "new-gm@example.com", requestedRole: "gm" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("blocks unauthenticated authority management", async () => {
    const caller = appRouter.createCaller(createContext(null));
    await expect(caller.auth.authority.policy()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.authority.invitations()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.authority.invite({ email: "new-gm@example.com", requestedRole: "gm" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.auth.securityStatus()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("reports OAuth-managed security without inventing an app password", async () => {
    const caller = appRouter.createCaller(createContext("user"));
    await expect(caller.auth.securityStatus()).resolves.toEqual({
      authProvider: "manus-oauth",
      email: "user@example.com",
      emailVerification: "not-exposed-by-current-oauth-contract",
      password: { storedByApp: false, changeableInApp: false, recoveryInApp: false },
    });
  });

  it("allows master capability introspection without requiring a live database", async () => {
    const caller = appRouter.createCaller(createContext("master"));
    await expect(caller.auth.authority.policy()).resolves.toEqual({ role: "master", canManageAuthority: true, canRevokeCreatorAuthority: true });
  });

  it("allows GM to use creator preview while keeping authority routes blocked", async () => {
    const caller = appRouter.createCaller(createContext("gm"));
    await expect(caller.creator.dependencyGraph.preview(validGraph)).resolves.toMatchObject({ previewOnly: true, graph: { valid: true } });
    await expect(caller.auth.authority.policy()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
