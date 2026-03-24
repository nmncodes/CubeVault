import type { IncomingMessage, ServerResponse } from "node:http";
import { createSolveStorageMiddleware } from "../server/solves";

const solveStorageMiddleware = createSolveStorageMiddleware();

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
) {
  await new Promise<void>((resolve, reject) => {
    solveStorageMiddleware(req, res, (error) => {
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
              : "Unable to handle solve request.",
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
