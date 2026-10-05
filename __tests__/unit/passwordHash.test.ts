jest.mock("expo-crypto", () => ({
  randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
  getRandomBytesAsync: async (length: number) => new Uint8Array(length).fill(7),
}));

import { hashPassword, verifyPassword } from "../../src/features/auth/passwordHash";

describe("password storage", () => {
  it("stores a salted PBKDF2 hash and verifies only the matching password", async () => {
    const encoded = await hashPassword("a-long-password");
    expect(encoded).toMatch(/^pbkdf2-sha256\$600000\$/);
    expect(await verifyPassword("a-long-password", encoded)).toBe(true);
    expect(await verifyPassword("incorrect-password", encoded)).toBe(false);
    expect(await verifyPassword("a-long-password", "pbkdf2-sha256$10$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
  }, 15_000);
});
