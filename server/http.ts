import type { IncomingMessage, ServerResponse } from "node:http";

function getRequestUrl(req: IncomingMessage) {
  return new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
}

export function getPathname(req: IncomingMessage) {
  return getRequestUrl(req).pathname;
}

export function writeJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

async function readRawBody(
  req: IncomingMessage,
  maxBytes = 1_000_000
): Promise<Buffer | undefined> {
  if (req.method === "GET" || req.method === "HEAD") {
    return undefined;
  }

  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body is too large."));
        return;
      }

      chunks.push(chunk);
    });

    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

export async function readJsonBody(req: IncomingMessage) {
  const body = await readRawBody(req);
  if (!body || body.length === 0) {
    return {};
  }

  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new Error("Invalid JSON body.");
  }
}

export async function toWebRequest(req: IncomingMessage) {
  const headers = new Headers();

  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) {
      value.forEach((item) => headers.append(key, item));
      continue;
    }

    if (typeof value === "string") {
      headers.set(key, value);
    }
  }

  const body = await readRawBody(req);

  return new Request(getRequestUrl(req), {
    method: req.method ?? "GET",
    headers,
    body: body ? new Uint8Array(body) : undefined,
  });
}

export async function writeWebResponse(
  res: ServerResponse,
  response: Response
) {
  res.statusCode = response.status;

  response.headers.forEach((value, key) => {
    if (key.toLowerCase() === "set-cookie") return;
    res.setHeader(key, value);
  });

  const setCookies =
    typeof response.headers.getSetCookie === "function"
      ? response.headers.getSetCookie()
      : [];

  if (setCookies.length > 0) {
    res.setHeader("Set-Cookie", setCookies);
  } else {
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) {
      res.setHeader("Set-Cookie", setCookie);
    }
  }

  const body = await response.arrayBuffer();
  res.end(Buffer.from(body));
}
