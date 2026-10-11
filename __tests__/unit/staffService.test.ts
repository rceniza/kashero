jest.mock("../../src/features/auth/passwordHash", () => ({ hashPassword: jest.fn(async (password: string) => `hash:${password}`) }));

import { StaffService, DuplicateUsernameError, StaffPermissionError, StaffValidationError } from "../../src/features/auth/StaffService";
import type { NewUser, User, UserCredential, UserRepository } from "../../src/features/auth/UserRepository";

class MemoryUsers implements UserRepository {
  rows: UserCredential[] = [];
  async countUsers() { return this.rows.length; }
  async create(input: NewUser): Promise<User> {
    if (this.rows.some(({ username }) => username === input.username)) throw new Error("UNIQUE constraint failed: users.username");
    const user = { ...input, id: `user-${this.rows.length + 1}`, isActive: true, createdAt: "now", updatedAt: "now" };
    this.rows.push(user);
    const { passwordHash: _hash, ...safeUser } = user;
    return safeUser;
  }
  async list(): Promise<User[]> { return this.rows.map(({ passwordHash: _hash, ...user }) => user); }
  async findById(id: string): Promise<User | null> { const { passwordHash: _hash, ...user } = this.rows.find((row) => row.id === id) ?? {} as UserCredential; return user.id ? user : null; }
  async findByUsername(username: string) { return this.rows.find((row) => row.username === username) ?? null; }
  async updatePassword(id: string, passwordHash: string) { const row = this.rows.find((user) => user.id === id); if (row) row.passwordHash = passwordHash; }
  async setActive(id: string, isActive: boolean) { const row = this.rows.find((user) => user.id === id); if (row) row.isActive = isActive; }
}

describe("staff account rules", () => {
  it("allows only owners to list and create cashier accounts with normalized usernames and hashed passwords", async () => {
    const repository = new MemoryUsers();
    const service = new StaffService(repository);
    await expect(service.createCashier("cashier", { displayName: "Pat Cashier", username: "pat", password: "a-long-password" })).rejects.toBeInstanceOf(StaffPermissionError);
    await expect(service.list("manager")).rejects.toBeInstanceOf(StaffPermissionError);
    const created = await service.createCashier("owner", { displayName: "Pat Cashier", username: " PAT ", password: "a-long-password" });
    expect(created).toMatchObject({ username: "pat", role: "cashier", isActive: true });
    expect(repository.rows[0].passwordHash).toBe("hash:a-long-password");
    expect(created).not.toHaveProperty("passwordHash");
  });

  it("rejects invalid or duplicate usernames and weak passwords", async () => {
    const repository = new MemoryUsers();
    const service = new StaffService(repository);
    await expect(service.createCashier("owner", { displayName: "Pat", username: "x", password: "short" })).rejects.toBeInstanceOf(StaffValidationError);
    await service.createCashier("owner", { displayName: "Pat Cashier", username: "pat", password: "a-long-password" });
    await expect(service.createCashier("owner", { displayName: "Other Cashier", username: " PAT ", password: "another-long-password" })).rejects.toBeInstanceOf(DuplicateUsernameError);
  });

  it("resets passwords and activates/deactivates cashier accounts but protects owners and the actor", async () => {
    const repository = new MemoryUsers();
    const service = new StaffService(repository);
    const cashier = await service.createCashier("owner", { displayName: "Pat Cashier", username: "pat", password: "a-long-password" });
    const owner = await repository.create({ displayName: "Store Owner", username: "owner", role: "owner", passwordHash: "hash" });
    await service.resetPassword("owner", owner.id, cashier.id, "a-new-long-password");
    expect(repository.rows[0].passwordHash).toBe("hash:a-new-long-password");
    await service.setCashierActive("owner", owner.id, cashier.id, false);
    expect(repository.rows[0].isActive).toBe(false);
    await service.setCashierActive("owner", owner.id, cashier.id, true);
    expect(repository.rows[0].isActive).toBe(true);
    await expect(service.setCashierActive("owner", owner.id, owner.id, false)).rejects.toBeInstanceOf(StaffPermissionError);
    await expect(service.resetPassword("owner", cashier.id, cashier.id, "a-new-long-password")).rejects.toBeInstanceOf(StaffPermissionError);
  });
});
