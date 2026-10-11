import { hashPassword } from "./passwordHash";
import { normalizeUsername, validateCredentials } from "./credentials";
import type { User, UserRepository } from "./UserRepository";
import type { UserRole } from "./roles";

export type CreateCashierInput = { displayName: string; username: string; password: string };

export class StaffService {
  constructor(private readonly users: UserRepository) {}

  async list(actorRole: UserRole): Promise<User[]> {
    requireOwner(actorRole);
    return this.users.list();
  }

  async createCashier(actorRole: UserRole, input: CreateCashierInput): Promise<User> {
    requireOwner(actorRole);
    const errors = validateCredentials(input);
    if (Object.keys(errors).length > 0) throw new StaffValidationError(errors);
    const username = normalizeUsername(input.username);
    if (await this.users.findByUsername(username)) throw new DuplicateUsernameError();
    try {
      return await this.users.create({
        displayName: input.displayName.trim(),
        username,
        role: "cashier",
        passwordHash: await hashPassword(input.password),
      });
    } catch (error) {
      if (isUniqueConstraintError(error)) throw new DuplicateUsernameError();
      throw error;
    }
  }

  async resetPassword(actorRole: UserRole, actorId: string, targetId: string, password: string): Promise<void> {
    requireOwner(actorRole);
    const target = await this.getCashier(targetId);
    requireCashier(target);
    if (actorId === target.id) throw new StaffPermissionError("You cannot change your own account here.");
    const errors = validateCredentials({ displayName: target.displayName, username: target.username, password });
    if (errors.password) throw new StaffValidationError({ password: errors.password });
    await this.users.updatePassword(target.id, await hashPassword(password));
  }

  async setCashierActive(actorRole: UserRole, actorId: string, targetId: string, isActive: boolean): Promise<void> {
    requireOwner(actorRole);
    const target = await this.getCashier(targetId);
    requireCashier(target);
    if (actorId === target.id) throw new StaffPermissionError("You cannot deactivate your own account.");
    await this.users.setActive(target.id, isActive);
  }

  private async getCashier(id: string): Promise<User> {
    const target = await this.users.findById(id);
    if (!target) throw new StaffPermissionError("User account could not be found.");
    return target;
  }
}

function requireOwner(role: UserRole): void {
  if (role !== "owner") throw new StaffPermissionError();
}

function requireCashier(user: User): void {
  if (user.role !== "cashier") throw new StaffPermissionError("Only cashier accounts can be changed here.");
}

function isUniqueConstraintError(error: unknown): boolean {
  return error instanceof Error && /unique constraint/i.test(error.message);
}

export class StaffPermissionError extends Error {
  constructor(message = "Only the owner can manage staff.") { super(message); }
}

export class StaffValidationError extends Error {
  constructor(readonly fieldErrors: Partial<Record<"displayName" | "username" | "password", string>>) {
    super("Please correct the highlighted fields.");
  }
}

export class DuplicateUsernameError extends Error {
  constructor() { super("That username is already in use."); }
}
