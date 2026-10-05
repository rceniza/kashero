export const USER_ROLES = ["owner", "manager", "cashier"] as const;
export type UserRole = (typeof USER_ROLES)[number];

const roleRank: Record<UserRole, number> = {
  cashier: 0,
  manager: 1,
  owner: 2,
};

export function parseUserRole(value: unknown): UserRole | null {
  return typeof value === "string" && USER_ROLES.includes(value as UserRole)
    ? (value as UserRole)
    : null;
}

export function roleAtLeast(role: UserRole, minimum: UserRole): boolean {
  return roleRank[role] >= roleRank[minimum];
}
