import { createUuid, utcNowIso } from "../../shared/ids";
import type {
  NewUser,
  User,
  UserCredential,
  UserRepository,
} from "../../features/auth/UserRepository";
import { parseUserRole } from "../../features/auth/roles";

export interface UserSqlDatabase {
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
}
