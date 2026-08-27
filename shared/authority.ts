export const AUTHORITY_ROLES = ["user", "gm", "admin", "master"] as const;
export type AuthorityRole = (typeof AUTHORITY_ROLES)[number];

export const CREATOR_ROLES = ["gm", "admin", "master"] as const satisfies readonly AuthorityRole[];

export function normalizeAuthorityEmail(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

export function isCreatorRole(role: AuthorityRole | null | undefined): boolean {
  return role === "gm" || role === "admin" || role === "master";
}

export function isMasterRole(role: AuthorityRole | null | undefined): boolean {
  return role === "master";
}

export function canManageAuthority(role: AuthorityRole | null | undefined): boolean {
  return isMasterRole(role);
}

export function canUseCreatorTools(role: AuthorityRole | null | undefined): boolean {
  return isCreatorRole(role);
}

export function canRevokeCreatorAuthority(role: AuthorityRole | null | undefined): boolean {
  return isMasterRole(role);
}

export function roleGrantedByMasterEmail(input: {
  email: string | null | undefined;
  masterEmail: string | null | undefined;
}): AuthorityRole | null {
  const email = normalizeAuthorityEmail(input.email);
  const masterEmail = normalizeAuthorityEmail(input.masterEmail);
  return email && masterEmail && email === masterEmail ? "master" : null;
}

export type AuthorityInvitationStatus = "pending" | "accepted" | "revoked" | "expired";

export function isAuthorityInvitationActive(input: { status: AuthorityInvitationStatus; expiresAt: Date; now: Date }): boolean {
  return input.status === "pending" && input.expiresAt.getTime() > input.now.getTime();
}

export function canAcceptAuthorityInvitation(input: { invitationEmail: string; userEmail: string | null | undefined; status: AuthorityInvitationStatus; expiresAt: Date; now: Date }): boolean {
  const invitationEmail = normalizeAuthorityEmail(input.invitationEmail);
  const userEmail = normalizeAuthorityEmail(input.userEmail);
  return Boolean(invitationEmail && userEmail && invitationEmail === userEmail && isAuthorityInvitationActive(input));
}

export function resolveOAuthAuthorityRole(input: {
  currentRole: AuthorityRole | null | undefined;
  openId: string;
  ownerOpenId: string | null | undefined;
  email: string | null | undefined;
  masterEmail: string | null | undefined;
  invitedRole?: "admin" | "gm" | null;
}): AuthorityRole {
  if (roleGrantedByMasterEmail({ email: input.email, masterEmail: input.masterEmail }) === "master") return "master";
  if (input.ownerOpenId && input.openId === input.ownerOpenId) return "master";
  if (input.currentRole === "master") return "master";
  if (input.currentRole === "admin" || input.currentRole === "gm") return input.currentRole;
  if (input.invitedRole === "admin" || input.invitedRole === "gm") return input.invitedRole;
  return "user";
}
