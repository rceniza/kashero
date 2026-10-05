import type { UserRole } from "./roles";

export type User = {
  id: string;
  displayName: string;
  username: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type UserCredential = User & { passwordHash: string };

export type NewUser = {
  displayName: string;
  username: string;
  role: UserRole;
  passwordHash: string;
};

export interface UserRepository {
  countUsers(): Promise<number>;
  create(user: NewUser): Promise<User>;
  findByUsername(username: string): Promise<UserCredential | null>;
}
