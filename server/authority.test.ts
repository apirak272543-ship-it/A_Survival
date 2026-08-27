import { describe, expect, it } from "vitest";
import {
  canManageAuthority,
  canRevokeCreatorAuthority,
  canUseCreatorTools,
  canAcceptAuthorityInvitation,
  isAuthorityInvitationActive,
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

  it("accepts only a pending, unexpired invitation for the exact OAuth email", () => {
    const now = new Date("2026-08-27T00:00:00.000Z");
    expect(isAuthorityInvitationActive({ status: "pending", expiresAt: new Date("2026-08-28T00:00:00.000Z"), now })).toBe(true);
    expect(isAuthorityInvitationActive({ status: "pending", expiresAt: now, now })).toBe(false);
    expect(canAcceptAuthorityInvitation({ invitationEmail: " GM@Example.com ", userEmail: "gm@example.com", status: "pending", expiresAt: new Date("2026-08-28T00:00:00.000Z"), now })).toBe(true);
    expect(canAcceptAuthorityInvitation({ invitationEmail: "gm@example.com", userEmail: "other@example.com", status: "pending", expiresAt: new Date("2026-08-28T00:00:00.000Z"), now })).toBe(false);
    expect(canAcceptAuthorityInvitation({ invitationEmail: "gm@example.com", userEmail: "gm@example.com", status: "revoked", expiresAt: new Date("2026-08-28T00:00:00.000Z"), now })).toBe(false);
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
