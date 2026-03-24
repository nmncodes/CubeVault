import type { IncomingMessage, ServerResponse } from "node:http";
import { createAuthMiddleware } from "../server/auth";

const authMiddleware = createAuthMiddleware();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  await new Promise<void>((resolve, reject) => {
    authMiddleware(req, res, (error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  }).catch((error) => {
    if (!res.writableEnded) {
      res.statusCode = 500;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.end(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : "Unable to handle /api/auth-meta.",
        })
      );
    }
  });

  if (!res.writableEnded) {
    res.statusCode = 404;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify({ error: "Not found." }));
  }
}
