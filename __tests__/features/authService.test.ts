jest.mock("../../src/features/auth/passwordHash", () => ({
  hashPassword: jest.fn(async (password: string) => `test-hash:${password}`),
  verifyPassword: jest.fn(async (password: string, hash: string) => hash === `test-hash:${password}`),
}));

import { AuthService, InvalidCredentialsError } from "../../src/features/auth/AuthService";
import type { NewUser, User, UserCredential, UserRepository } from "../../src/features/auth/UserRepository";

class MemoryUsers implements UserRepository {
  rows: UserCredential[] = [];
  async countUsers() { return this.rows.length; }
  async create(input: NewUser): Promise<User> {
    const user = { ...input, id: "owner-id", isActive: true, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-01T00:00:00.000Z" };
    this.rows.push(user);
    return user;
  }
  async findByUsername(username: string) { return this.rows.find((user) => user.username === username) ?? null; }
}

describe("local authentication feature", () => {
  it("creates the first owner, logs in with normalized username, and returns no hash", async () => {
    const service = new AuthService(new MemoryUsers());
    expect(await service.needsOwnerSetup()).toBe(true);
    await service.createOwner({ displayName: "Sam", username: "SAM", password: "a-long-password" });
    expect(await service.needsOwnerSetup()).toBe(false);
    const user = await service.login(" sam ", "a-long-password");
    expect(user).toMatchObject({ username: "sam", role: "owner" });
    expect(user).not.toHaveProperty("passwordHash");
    await expect(service.createOwner({ displayName: "Other", username: "other", password: "another-long-password" })).rejects.toThrow("already been completed");
  });

  it("rejects wrong credentials with a generic message and blocks inactive users", async () => {
    const repository = new MemoryUsers();
    const service = new AuthService(repository);
    await service.createOwner({ displayName: "Sam", username: "sam", password: "a-long-password" });
    await expect(service.login("sam", "wrong-password")).rejects.toBeInstanceOf(InvalidCredentialsError);
    repository.rows[0].isActive = false;
    await expect(service.login("sam", "a-long-password")).rejects.toThrow("Username or password is incorrect.");
  });
});
