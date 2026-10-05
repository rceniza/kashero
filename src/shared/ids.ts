import { randomUUID } from "expo-crypto";

export function createUuid(): string {
  return randomUUID();
}

export function utcNowIso(): string {
  return new Date().toISOString();
}
