import { useCallback, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import {
  AuthContext,
  type AuthContextValue,
  type AuthProviderOption,
  type AuthSession,
} from "@/lib/auth-context";

type AuthMetaResponse = {
  authConfigured?: boolean;
  databaseConfigured?: boolean;
  providers?: AuthProviderOption[];
};

type CsrfResponse = {
  csrfToken?: string;
};

async function parseJson<T>(response: Response) {
  if (!response.ok) {
    let message = "Request failed.";
    try {
      const payload = (await response.json()) as { error?: string; message?: string };
      message = payload.error || payload.message || message;
    } catch {
      // Fallback message is enough here.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

function getCallbackUrl() {
  return new URL(
    `${window.location.pathname}${window.location.search}`,
    window.location.origin
  ).toString();
}

async function getCsrfToken() {
  const payload = await parseJson<CsrfResponse>(
    await fetch(`${API_BASE_URL}/api/auth/csrf`, {
      credentials: "same-origin",
      cache: "no-store",
    })
  );

  if (!payload.csrfToken) {
    throw new Error("Auth.js did not return a CSRF token.");
  }

  return payload.csrfToken;
}

async function postAuthAction(path: string) {
  const csrfToken = await getCsrfToken();
  const body = new URLSearchParams({
    csrfToken,
    callbackUrl: getCallbackUrl(),
  });

  const payload = await parseJson<{ url?: string }>(
    await fetch(path, {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Auth-Return-Redirect": "1",
      },
      body,
    })
  );

  if (payload.url) {
    window.location.assign(payload.url);
  }
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<AuthSession>(null);
  const [providers, setProviders] = useState<AuthProviderOption[]>([]);
  const [isAuthConfigured, setIsAuthConfigured] = useState(false);
  const [isStorageConfigured, setIsStorageConfigured] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    setIsLoading(false);
    setIsAuthConfigured(false);
    setIsStorageConfigured(false);
    setSession(null);
    /* 
    setIsLoading(true);

    try {
      const meta = await parseJson<AuthMetaResponse>(
        await fetch(`${API_BASE_URL}/api/auth-meta`, {
          credentials: "same-origin",
          cache: "no-store",
        })
      );

      setIsAuthConfigured(Boolean(meta.authConfigured));
      setIsStorageConfigured(Boolean(meta.databaseConfigured));
      setProviders(Array.isArray(meta.providers) ? meta.providers : []);

      if (!meta.authConfigured) {
        setSession(null);
        return;
      }

      const nextSession = await parseJson<AuthSession>(
        await fetch(`${API_BASE_URL}/api/auth/session`, {
          credentials: "same-origin",
          cache: "no-store",
        })
      );
      setSession(nextSession);
    } catch (error) {
      console.error("Unable to refresh auth session.", error);
      setSession(null);
      setProviders([]);
      setIsAuthConfigured(false);
      setIsStorageConfigured(false);
    } finally {
      setIsLoading(false);
    }
    */
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      providers,
      isAuthConfigured,
      isStorageConfigured,
      isLoading,
      async signInWithOAuth(providerId) {
        if (!isAuthConfigured) {
          throw new Error("Auth.js is not configured.");
        }
        await postAuthAction(`${API_BASE_URL}/api/auth/signin/${providerId}`);
      },
      async signOut() {
        if (!isAuthConfigured) return;
        await postAuthAction(`${API_BASE_URL}/api/auth/signout`);
      },
      refreshSession,
    }),
    [
      isAuthConfigured,
      isLoading,
      isStorageConfigured,
      providers,
      refreshSession,
      session,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
