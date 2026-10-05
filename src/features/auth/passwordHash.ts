import { pbkdf2Async } from "@noble/hashes/pbkdf2.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { getRandomBytesAsync } from "expo-crypto";

export const PASSWORD_HASH_ITERATIONS = 600_000;
const SALT_LENGTH = 16;
const HASH_LENGTH = 32;
const FORMAT = "pbkdf2-sha256";

export async function hashPassword(password: string): Promise<string> {
  const salt = await getRandomBytesAsync(SALT_LENGTH);
  return encodePasswordHash(password, bytesToHex(salt), PASSWORD_HASH_ITERATIONS);
}

export async function encodePasswordHash(
  password: string,
  saltHex: string,
  iterations: number,
): Promise<string> {
  const derived = await pbkdf2Async(
    sha256,
    utf8ToBytes(password),
    hexToBytes(saltHex),
    { c: iterations, dkLen: HASH_LENGTH },
  );
  return `${FORMAT}$${iterations}$${saltHex}$${bytesToHex(derived)}`;
}

export async function verifyPassword(
  password: string,
  encodedHash: string,
): Promise<boolean> {
  const parts = encodedHash.split("$");
  if (parts.length !== 4 || parts[0] !== FORMAT) return false;

  const iterations = Number(parts[1]);
  const saltHex = parts[2];
  const expectedHex = parts[3];
  if (
    !Number.isSafeInteger(iterations) ||
    iterations < PASSWORD_HASH_ITERATIONS ||
    iterations > 2_000_000 ||
    !/^[0-9a-f]{32}$/.test(saltHex) ||
    !/^[0-9a-f]{64}$/.test(expectedHex)
  ) {
    return false;
  }

  const actual = await encodePasswordHash(password, saltHex, iterations);
  return constantTimeEqual(actual, encodedHash);
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return difference === 0;
}
