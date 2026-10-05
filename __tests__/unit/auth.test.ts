jest.mock("expo-crypto", () => ({ randomUUID: () => "123e4567-e89b-42d3-a456-426614174000" }));

import { createUuid, utcNowIso } from "../../src/shared/ids";
import { normalizeUsername, validateCredentials } from "../../src/features/auth/credentials";
import { parseUserRole, roleAtLeast } from "../../src/features/auth/roles";

describe("local account rules", () => {
  it("normalizes usernames and validates owner credentials", () => {
    expect(normalizeUsername("  Sam.Cashier ")).toBe("sam.cashier");
    expect(validateCredentials({ displayName: "Sam", username: "sam_1", password: "long-enough-password" })).toEqual({});
    expect(validateCredentials({ displayName: "S", username: "x", password: "short" })).toHaveProperty("password");
  });

  it("accepts known roles and applies the role hierarchy", () => {
    expect(parseUserRole("manager")).toBe("manager");
    expect(parseUserRole("admin")).toBeNull();
    expect(roleAtLeast("owner", "manager")).toBe(true);
    expect(roleAtLeast("cashier", "manager")).toBe(false);
  });

  it("creates RFC 4122 UUIDs and UTC timestamps", () => {
    expect(createUuid()).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    expect(utcNowIso()).toMatch(/^\d{4}-\d\d-\d\dT.*Z$/);
  });
});
