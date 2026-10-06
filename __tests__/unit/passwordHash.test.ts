jest.mock("expo-crypto", () => ({
  randomUUID: () => "123e4567-e89b-42d3-a456-426614174000",
  getRandomBytesAsync: async (length: number) => new Uint8Array(length).fill(7),
}));
jest.mock("react-native-quick-crypto", () => ({
  pbkdf2: (
    password: Uint8Array,
    salt: Uint8Array,
    iterations: number,
    keyLength: number,
    _digest: string,
    callback: (error: Error | null, key?: Uint8Array) => void,
  ) => {
    const { pbkdf2Async } = require("@noble/hashes/pbkdf2.js");
    const { sha256 } = require("@noble/hashes/sha2.js");
    void pbkdf2Async(sha256, password, salt, { c: iterations, dkLen: keyLength })
      .then((key: Uint8Array) => callback(null, key), callback);
  },
}));

import { hashPassword, verifyPassword } from "../../src/features/auth/passwordHash";

describe("password storage", () => {
  it("stores a salted PBKDF2 hash and verifies only the matching password", async () => {
    const encoded = await hashPassword("a-long-password");
    expect(encoded).toBe(
      "pbkdf2-sha256$600000$07070707070707070707070707070707$a64f5453d34965128045401b0a88062cf5be6bbb2b063d5578b74dd59a9a54f9",
    );
    expect(await verifyPassword("a-long-password", encoded)).toBe(true);
    expect(await verifyPassword("incorrect-password", encoded)).toBe(false);
    expect(await verifyPassword("a-long-password", "pbkdf2-sha256$10$00000000000000000000000000000000$0000000000000000000000000000000000000000000000000000000000000000")).toBe(false);
  }, 15_000);
});
