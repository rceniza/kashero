import type { UserRole } from "../auth/roles";
import type { StoreSettingsRepository } from "./StoreSettingsRepository";

export class StoreProfileService {
  constructor(private readonly repository: StoreSettingsRepository) {}

  getStoreName(): Promise<string> {
    return this.repository.getStoreName();
  }

  async saveStoreName(role: UserRole, value: string): Promise<void> {
    if (role !== "owner") throw new StoreProfilePermissionError();
    const name = value.trim();
    if (!name) throw new StoreProfileValidationError("Enter a store name.");
    if (name.length > 30) throw new StoreProfileValidationError("Store name must be 30 characters or fewer.");
    await this.repository.saveStoreName(name);
  }
}

export class StoreProfileValidationError extends Error {}
export class StoreProfilePermissionError extends Error {
  constructor() { super("Only the owner can change the store name."); }
}
