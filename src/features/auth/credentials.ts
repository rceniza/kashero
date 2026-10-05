export type CredentialsInput = {
  displayName: string;
  username: string;
  password: string;
};

export type CredentialField = "displayName" | "username" | "password";

export function normalizeUsername(username: string): string {
  return username.trim().toLocaleLowerCase("en-US");
}

export function validateCredentials(
  input: CredentialsInput,
): Partial<Record<CredentialField, string>> {
  const errors: Partial<Record<CredentialField, string>> = {};
  const name = input.displayName.trim();
  const username = normalizeUsername(input.username);

  if (name.length < 2 || name.length > 60) {
    errors.displayName = "Enter a name between 2 and 60 characters.";
  }
  if (!/^[a-z0-9._-]{3,40}$/.test(username)) {
    errors.username = "Use 3–40 letters, numbers, dots, dashes, or underscores.";
  }
  if (input.password.length < 10 || input.password.length > 128) {
    errors.password = "Use a password between 10 and 128 characters.";
  }

  return errors;
}
