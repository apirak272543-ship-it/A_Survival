import { describe, expect, it } from "vitest";
import {
  canManageAuthority,
  canRevokeCreatorAuthority,
  canUseCreatorTools,
  normalizeAuthorityEmail,
  resolveOAuthAuthorityRole,
  roleGrantedByMasterEmail,
} from "../shared/authority";

describe("authority policy", () => {
  it("normalizes master email comparison without changing stored identity", () => {
    expect(normalizeAuthorityEmail("  APIRAK272543@GMAIL.COM ")).toBe("apirak272543@gmail.com");
    expect(roleGrantedByMasterEmail({ email: "APIRAK272543@GMAIL.COM", masterEmail: "apirak272543@gmail.com" })).toBe("master");
    expect(roleGrantedByMasterEmail({ email: "other@example.com", masterEmail: "apirak272543@gmail.com" })).toBeNull();
  });

  it("keeps the configured owner as master while preserving invited creator roles", () => {
    expect(resolveOAuthAuthorityRole({ currentRole: "user", openId: "owner-open-id", ownerOpenId: "owner-open-id", email: null, masterEmail: null })).toBe("master");
    expect(resolveOAuthAuthorityRole({ currentRole: "user", openId: "gm-open-id", ownerOpenId: "owner-open-id", email: "gm@example.com", masterEmail: "master@example.com", invitedRole: "gm" })).toBe("gm");
    expect(resolveOAuthAuthorityRole({ currentRole: "admin", openId: "admin-open-id", ownerOpenId: "owner-open-id", email: "admin@example.com", masterEmail: "master@example.com" })).toBe("admin");
    expect(resolveOAuthAuthorityRole({ currentRole: "master", openId: "owner-open-id", ownerOpenId: "owner-open-id", email: "other@example.com", masterEmail: "master@example.com", invitedRole: "gm" })).toBe("master");
  });

  it("allows creator tools to GM/admin/master but reserves authority changes for master", () => {
    expect(canUseCreatorTools("user")).toBe(false);
    expect(canUseCreatorTools("gm")).toBe(true);
    expect(canUseCreatorTools("admin")).toBe(true);
    expect(canUseCreatorTools("master")).toBe(true);
    expect(canManageAuthority("admin")).toBe(false);
    expect(canManageAuthority("master")).toBe(true);
    expect(canRevokeCreatorAuthority("gm")).toBe(false);
    expect(canRevokeCreatorAuthority("master")).toBe(true);
  });
});
