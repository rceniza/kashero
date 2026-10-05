import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";

import { AuthService } from "./AuthService";
import type { CredentialsInput } from "./credentials";
import type { User } from "./UserRepository";

type AuthContextValue = {
  loading: boolean;
  needsSetup: boolean;
  user: User | null;
  error: string | null;
  setupOwner(input: CredentialsInput): Promise<void>;
  login(username: string, password: string): Promise<void>;
  logout(): void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({
  service,
  children,
}: PropsWithChildren<{ service: AuthService }>) {
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    service.needsOwnerSetup().then((required) => {
      if (mounted) {
        setNeedsSetup(required);
        setLoading(false);
      }
    }).catch(() => {
      if (mounted) {
        setError("Kashero could not open its local database.");
        setLoading(false);
      }
    });
    return () => { mounted = false; };
  }, [service]);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    needsSetup,
    user,
    error,
    async setupOwner(input) {
      setError(null);
      try {
        const created = await service.createOwner(input);
        setUser(created);
        setNeedsSetup(false);
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Setup failed.");
        throw cause;
      }
    },
    async login(username, password) {
      setError(null);
      try {
        setUser(await service.login(username, password));
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Login failed.";
        setError(message);
        throw cause;
      }
    },
    logout() {
      setUser(null);
      setError(null);
    },
  }), [loading, needsSetup, user, error, service]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider.");
  return value;
}
