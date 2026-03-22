import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import os from "node:os";
import { spawn } from "node:child_process";
import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";

const API_PATH = "/api/solve";
const SOLVER_SCRIPT_PATH = path.resolve(__dirname, "solver", "solve_scramble.py");
const ALLOWED_METHODS = new Set(["Kociemba", "CFOP", "Beginner"]);

type SolverResponse = {
  method: string;
  algorithm: string;
  moveCount: number;
  states: string[];
  elapsedMs: number;
};

type PythonTarget = {
  command: string;
  preArgs: string[];
  label: string;
};

function getPythonTargets(): PythonTarget[] {
  const targets: PythonTarget[] = [];

  if (process.env.CUBEVAULT_PYTHON) {
    targets.push({
      command: process.env.CUBEVAULT_PYTHON,
      preArgs: [],
      label: "env:CUBEVAULT_PYTHON",
    });
  }

  targets.push({
    command: path.join(
      os.homedir(),
      "AppData",
      "Local",
      "Programs",
      "Python",
      "Python311",
      "python.exe"
    ),
    preArgs: [],
    label: "Python311",
  });

  targets.push({ command: "python", preArgs: [], label: "python" });
  targets.push({ command: "py", preArgs: ["-3"], label: "py -3" });
  targets.push({ command: "py", preArgs: [], label: "py" });

  const seen = new Set<string>();
  return targets.filter((target) => {
    const key = `${target.command}|${target.preArgs.join(" ")}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;

    req.on("data", (chunk: Buffer) => {
      size += chunk.length;
      if (size > 1_000_000) {
        reject(new Error("Request body is too large."));
        return;
      }
      chunks.push(chunk);
    });

    req.on("end", () => {
      try {
        const body = Buffer.concat(chunks).toString("utf8") || "{}";
        resolve(JSON.parse(body));
      } catch {
        reject(new Error("Invalid JSON body."));
      }
    });

    req.on("error", reject);
  });
}

function writeJson(
  res: ServerResponse,
  statusCode: number,
  payload: Record<string, unknown>
) {
  res.statusCode = statusCode;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function runSolverWithTarget(
  target: PythonTarget,
  scramble: string,
  method: string
): Promise<SolverResponse> {
  return new Promise((resolve, reject) => {
    const child = spawn(target.command, [
      ...target.preArgs,
      SOLVER_SCRIPT_PATH,
      scramble,
      method,
    ]);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (data: Buffer) => {
      stdout += data.toString("utf8");
    });

    child.stderr.on("data", (data: Buffer) => {
      stderr += data.toString("utf8");
    });

    const timeoutId = setTimeout(() => {
      child.kill("SIGTERM");
      reject(new Error(`Solver timed out using ${target.label}.`));
    }, 15_000);

    child.on("error", (error) => {
      clearTimeout(timeoutId);
      reject(error);
    });

    child.on("close", (code) => {
      clearTimeout(timeoutId);

      if (code !== 0) {
        reject(
          new Error(
            `${target.label} exited with code ${code}. ${stderr.trim() || stdout.trim()}`
          )
        );
        return;
      }

      const outputLines = stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);

      if (outputLines.length === 0) {
        reject(new Error(`${target.label} returned empty output.`));
        return;
      }

      const lastLine = outputLines[outputLines.length - 1];

      try {
        const parsed = JSON.parse(lastLine) as
          | (Partial<SolverResponse> & { error?: string; ok?: boolean })
          | null;

        if (!parsed || parsed.ok === false) {
          reject(new Error(parsed?.error || "Solver returned an error."));
          return;
        }

        if (
          typeof parsed.method !== "string" ||
          typeof parsed.algorithm !== "string" ||
          typeof parsed.moveCount !== "number" ||
          !Array.isArray(parsed.states) ||
          !parsed.states.every((state) => typeof state === "string") ||
          typeof parsed.elapsedMs !== "number"
        ) {
          reject(new Error("Solver returned malformed payload."));
          return;
        }

        resolve({
          method: parsed.method,
          algorithm: parsed.algorithm,
          moveCount: parsed.moveCount,
          states: parsed.states,
          elapsedMs: parsed.elapsedMs,
        });
      } catch (error) {
        reject(
          new Error(
            `Unable to parse solver output from ${target.label}: ${(error as Error).message}`
          )
        );
      }
    });
  });
}

async function solveScramble(scramble: string, method: string) {
  const errors: string[] = [];

  for (const target of getPythonTargets()) {
    try {
      const result = await runSolverWithTarget(target, scramble, method);
      return {
        ...result,
        backend: target.label,
      };
    } catch (error) {
      errors.push(`${target.label}: ${(error as Error).message}`);
    }
  }

  throw new Error(
    "Solver backend unavailable. Make sure Python and rubik-solver are installed. " +
      errors.join(" | ")
  );
}

function rubikSolverApi(): Plugin {
  const middleware = async (
    req: IncomingMessage,
    res: ServerResponse,
    next: (err?: unknown) => void
  ) => {
    const url = req.url ? req.url.split("?")[0] : "";
    if (url !== API_PATH) {
      next();
      return;
    }

    if (req.method !== "POST") {
      writeJson(res, 405, { error: "Only POST is supported for /api/solve." });
      return;
    }

    try {
      const body = (await readJsonBody(req)) as Record<string, unknown>;
      const scramble = typeof body.scramble === "string" ? body.scramble.trim() : "";
      const method = typeof body.method === "string" ? body.method : "Kociemba";

      if (!scramble) {
        writeJson(res, 400, { error: "Missing scramble." });
        return;
      }

      if (!ALLOWED_METHODS.has(method)) {
        writeJson(res, 400, {
          error: `Invalid method. Use one of: ${Array.from(ALLOWED_METHODS).join(", ")}.`,
        });
        return;
      }

      const result = await solveScramble(scramble, method);
      writeJson(res, 200, result);
    } catch (error) {
      writeJson(res, 500, {
        error: error instanceof Error ? error.message : "Unknown solver error",
      });
    }
  };

  return {
    name: "cubevault-rubik-solver-api",
    configureServer(server) {
      server.middlewares.use(middleware);
    },
    configurePreviewServer(server) {
      server.middlewares.use(middleware);
    },
  };
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), rubikSolverApi()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
