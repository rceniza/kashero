import {
  normalizeUsername,
  validateCredentials,
  type CredentialsInput,
} from "./credentials";
import { hashPassword, verifyPassword } from "./passwordHash";
import type { User, UserRepository } from "./UserRepository";

export class AuthService {
  constructor(private readonly users: UserRepository) {}

  async needsOwnerSetup(): Promise<boolean> {
    return (await this.users.countUsers()) === 0;
  }

  async createOwner(input: CredentialsInput): Promise<User> {
    const errors = validateCredentials(input);
    if (Object.keys(errors).length > 0) throw new CredentialError(errors);
    if (!(await this.needsOwnerSetup())) {
      throw new Error("Owner setup has already been completed.");
    }
    return this.users.create({
      displayName: input.displayName.trim(),
      username: normalizeUsername(input.username),
      role: "owner",
      passwordHash: await hashPassword(input.password),
    });
  }

  async login(username: string, password: string): Promise<User> {
    const user = await this.users.findByUsername(normalizeUsername(username));
    if (!user || !user.isActive || !(await verifyPassword(password, user.passwordHash))) {
      throw new InvalidCredentialsError();
    }
    const { passwordHash: _passwordHash, ...safeUser } = user;
    return safeUser;
  }
}

export class CredentialError extends Error {
  constructor(readonly fieldErrors: ReturnType<typeof validateCredentials>) {
    super("Please correct the highlighted fields.");
  }
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Username or password is incorrect.");
  }
}
