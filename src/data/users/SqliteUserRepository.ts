import { createUuid, utcNowIso } from "../../shared/ids";
import type {
  NewUser,
  User,
  UserCredential,
  UserRepository,
} from "../../features/auth/UserRepository";
import { parseUserRole } from "../../features/auth/roles";

export interface UserSqlDatabase {
  getAllAsync<T>(sql: string, ...params: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, ...params: unknown[]): Promise<T | null>;
  runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }>;
}

type UserRow = {
  id: string;
  display_name: string;
  username: string;
  role: string;
  password_hash: string;
  is_active: number;
  created_at: string;
  updated_at: string;
};
type SafeUserRow = Omit<UserRow, "password_hash">;

export class SqliteUserRepository implements UserRepository {
  constructor(private readonly database: UserSqlDatabase) {}

  async countUsers(): Promise<number> {
    const row = await this.database.getFirstAsync<{ count: number }>(
      "SELECT COUNT(*) AS count FROM users",
    );
    return row?.count ?? 0;
  }

  async create(user: NewUser): Promise<User> {
    const now = utcNowIso();
    const id = createUuid();
    await this.database.runAsync(
      `INSERT INTO users
        (id, display_name, username, role, password_hash, is_active, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      id,
      user.displayName,
      user.username,
      user.role,
      user.passwordHash,
      now,
      now,
    );
    return {
      id,
      displayName: user.displayName,
      username: user.username,
      role: user.role,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  async findByUsername(username: string): Promise<UserCredential | null> {
    const row = await this.database.getFirstAsync<UserRow>(
      `SELECT id, display_name, username, role, password_hash, is_active, created_at, updated_at
       FROM users WHERE username = ?`,
      username,
    );
    if (!row) return null;

    const role = parseUserRole(row.role);
    if (!role) throw new Error("Stored user role is invalid.");
    return {
      id: row.id,
      displayName: row.display_name,
      username: row.username,
      role,
      passwordHash: row.password_hash,
      isActive: row.is_active === 1,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  async list(): Promise<User[]> {
    const rows = await this.database.getAllAsync<SafeUserRow>(
      `SELECT id, display_name, username, role, is_active, created_at, updated_at
       FROM users ORDER BY role DESC, display_name COLLATE NOCASE`,
    );
    return rows.map((row) => {
      const role = parseUserRole(row.role);
      if (!role) throw new Error("Stored user role is invalid.");
      return {
        id: row.id,
        displayName: row.display_name,
        username: row.username,
        role,
        isActive: row.is_active === 1,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      };
    });
  }

  async findById(id: string): Promise<User | null> {
    const row = await this.database.getFirstAsync<SafeUserRow>(
      `SELECT id, display_name, username, role, is_active, created_at, updated_at
       FROM users WHERE id = ?`, id,
    );
    if (!row) return null;
    const role = parseUserRole(row.role);
    if (!role) throw new Error("Stored user role is invalid.");
    return {
      id: row.id, displayName: row.display_name, username: row.username, role,
      isActive: row.is_active === 1, createdAt: row.created_at, updatedAt: row.updated_at,
    };
  }

  async updatePassword(id: string, passwordHash: string): Promise<void> {
    const result = await this.database.runAsync(
      "UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?",
      passwordHash,
      utcNowIso(),
      id,
    );
    if (result.changes !== 1) throw new Error("User account could not be found.");
  }

  async setActive(id: string, isActive: boolean): Promise<void> {
    const result = await this.database.runAsync(
      "UPDATE users SET is_active = ?, updated_at = ? WHERE id = ?",
      isActive ? 1 : 0,
      utcNowIso(),
      id,
    );
    if (result.changes !== 1) throw new Error("User account could not be found.");
  }
}
