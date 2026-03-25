import type { IncomingMessage, ServerResponse } from "node:http";
import { createAuthMiddleware } from "../server/auth.js";

const authMiddleware = createAuthMiddleware();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  await new Promise<void>((resolve, reject) => {
    authMiddleware(req, res, (error) => {
      if (error) reject(error);
      else resolve();
    });
  }).catch((error) => {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify({ error: error.message }));
  });

  if (res.writableEnded) return;

  const authConfigured = Boolean(process.env.AUTH_SECRET);
  const databaseConfigured = Boolean(process.env.DATABASE_URL);

  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      authConfigured,
      databaseConfigured,
      providers: [
        process.env.AUTH_GOOGLE_ID ? { id: "google", name: "Google" } : null,
      ].filter(Boolean),
    })
  );
}