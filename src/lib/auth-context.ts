import { createContext } from "react";

export type AuthProviderOption = {
  id: string;
  name: string;
};

export type AuthUser = {
  id?: string | null;
  name?: string | null;
  email?: string | null;
  image?: string | null;
};

export type AuthSession = {
  user?: AuthUser;
  expires: string;
} | null;

export type AuthContextValue = {
  session: AuthSession;
  user: AuthUser | null;
  providers: AuthProviderOption[];
  isAuthConfigured: boolean;
  isStorageConfigured: boolean;
  isLoading: boolean;
  signInWithOAuth: (providerId: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);
