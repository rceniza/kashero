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
  list(): Promise<User[]>;
  findById(id: string): Promise<User | null>;
  findByUsername(username: string): Promise<UserCredential | null>;
  updatePassword(id: string, passwordHash: string): Promise<void>;
  setActive(id: string, isActive: boolean): Promise<void>;
}
