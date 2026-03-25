import { Auth } from "@auth/core";
import GitHub from "@auth/core/providers/github";
import Google from "@auth/core/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import type { IncomingMessage, ServerResponse } from "node:http";
import { getPathname, toWebRequest, writeJson, writeWebResponse } from "./http.js";
import { prisma } from "./prisma.js";

type AuthProviderMeta = {
  id: string;
  name: string;
};

export type AuthSession = {
  user?: {
    id?: string | null;
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
  expires: string;
} | null;

type AuthConfigInput = Parameters<typeof Auth>[1];
type SessionCallbackArgs = {
  session: {
    user?: {
      id?: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
    expires: string;
  };
  user?: { id?: string };
  token?: { sub?: string };
};

function getConfiguredProviders() {
  const providers: Array<{
    meta: AuthProviderMeta;
    provider: unknown;
  }> = [];

  if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
    providers.push({
      meta: { id: "google", name: "Google" },
      provider: Google({
        clientId: process.env.AUTH_GOOGLE_ID,
        clientSecret: process.env.AUTH_GOOGLE_SECRET,
      }),
    });
  }

  if (process.env.AUTH_GITHUB_ID && process.env.AUTH_GITHUB_SECRET) {
    providers.push({
      meta: { id: "github", name: "GitHub" },
      provider: GitHub({
        clientId: process.env.AUTH_GITHUB_ID,
        clientSecret: process.env.AUTH_GITHUB_SECRET,
      }),
    });
  }

  return providers;
}

export function getAuthMeta() {
  const providers = getConfiguredProviders().map((entry) => entry.meta);

  return {
    authConfigured: Boolean(process.env.AUTH_SECRET && providers.length > 0),
    databaseConfigured: Boolean(process.env.DATABASE_URL),
    providers,
  };
}

function getAuthConfig() {
  const configured = getConfiguredProviders();

  return {
    secret: process.env.AUTH_SECRET,
    trustHost: true,
    basePath: "/api/auth",
    adapter: PrismaAdapter(prisma),
    session: {
      strategy: "database" as const,
    },
    providers: configured.map((entry) => entry.provider),
    callbacks: {
      async session({
        session,
        user,
        token,
      }: SessionCallbackArgs) {
        const resolvedUserId =
          (typeof user?.id === "string" && user.id.length > 0 && user.id) ||
          (typeof token?.sub === "string" && token.sub.length > 0 && token.sub) ||
          undefined;

        return {
          ...session,
          user: {
            ...session.user,
            id: resolvedUserId,
          },
        };
      },
    },
  };
}

export function getSessionUserId(session: AuthSession) {
  if (!session?.user) return null;

  if (typeof session.user.id === "string" && session.user.id.length > 0) {
    return session.user.id;
  }

  return null;
}

export async function getSessionFromRequest(request: Request) {
  const meta = getAuthMeta();
  if (!meta.authConfigured) return null;

  const sessionRequest = new Request(new URL("/api/auth/session", request.url), {
    method: "GET",
    headers: request.headers,
  });

  const response = (await Auth(
    sessionRequest,
    getAuthConfig() as unknown as AuthConfigInput
  )) as Response;
  if (!response.ok) return null;

  try {
    return (await response.json()) as AuthSession;
  } catch {
    return null;
  }
}

export function createAuthMiddleware() {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    const pathname = getPathname(req);

    if (pathname === "/api/auth-meta") {
      writeJson(res, 200, getAuthMeta());
      return;
    }

    if (!pathname.startsWith("/api/auth")) {
      next();
      return;
    }

    const meta = getAuthMeta();
    if (!meta.authConfigured) {
      writeJson(res, 503, {
        error:
          "Auth.js is not configured. Set AUTH_SECRET and at least one OAuth provider.",
      });
      return;
    }

    try {
      const request = await toWebRequest(req);
      const response = (await Auth(
        request,
        getAuthConfig() as unknown as AuthConfigInput
      )) as Response;
      await writeWebResponse(res, response);
    } catch (error) {
      writeJson(res, 500, {
        error:
          error instanceof Error ? error.message : "Unable to handle auth request.",
      });
    }
  };
}
