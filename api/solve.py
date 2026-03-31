from __future__ import annotations

import json
from http.server import BaseHTTPRequestHandler
from typing import Any

from solver.solve_scramble import ALLOWED_METHODS, solve_scramble


def write_json(handler: BaseHTTPRequestHandler, status: int, payload: dict[str, Any]) -> None:
    body = json.dumps(payload).encode("utf-8")
    handler.send_response(status)
    handler.send_header("Content-Type", "application/json; charset=utf-8")
    handler.send_header("Content-Length", str(len(body)))
    handler.end_headers()
    handler.wfile.write(body)


def read_json_body(handler: BaseHTTPRequestHandler) -> dict[str, Any]:
    content_length_header = handler.headers.get("Content-Length", "0").strip()
    content_length = int(content_length_header) if content_length_header else 0
    if content_length <= 0:
        return {}

    raw_body = handler.rfile.read(content_length)
    if not raw_body:
        return {}

    parsed = json.loads(raw_body.decode("utf-8"))
    return parsed if isinstance(parsed, dict) else {}


class handler(BaseHTTPRequestHandler):
    def do_POST(self) -> None:  # noqa: N802 (required method name)
        if self.path.split("?")[0] != "/api/solve":
            write_json(self, 404, {"error": "Not found."})
            return

        try:
            body = read_json_body(self)
        except json.JSONDecodeError:
            write_json(self, 400, {"error": "Invalid JSON body."})
            return

        scramble = body.get("scramble")
        method = body.get("method", "CFOP")

        if not isinstance(scramble, str) or not scramble.strip():
            write_json(self, 400, {"error": "Missing scramble."})
            return

        if not isinstance(method, str):
            method = "CFOP"

        if method not in ALLOWED_METHODS:
            write_json(
                self,
                400,
                {
                    "error": f"Invalid method. Use one of: {', '.join(sorted(ALLOWED_METHODS))}.",
                },
            )
            return

        try:
            result = solve_scramble(scramble.strip(), method)
        except Exception as exc:  # pragma: no cover - defensive API bridge
            write_json(self, 500, {"error": str(exc)})
            return

        payload = {
            "method": result.get("method"),
            "algorithm": result.get("algorithm"),
            "moveCount": result.get("moveCount"),
            "states": result.get("states"),
            "elapsedMs": result.get("elapsedMs"),
            "backend": "vercel-python",
        }

        if (
            not isinstance(payload["method"], str)
            or not isinstance(payload["algorithm"], str)
            or not isinstance(payload["moveCount"], int)
            or not isinstance(payload["states"], list)
            or any(not isinstance(state, str) for state in payload["states"])
            or not isinstance(payload["elapsedMs"], (int, float))
        ):
            write_json(self, 500, {"error": "Solver returned malformed payload."})
            return

        write_json(self, 200, payload)

    def do_GET(self) -> None:  # noqa: N802 (required method name)
        if self.path.split("?")[0] != "/api/solve":
            write_json(self, 404, {"error": "Not found."})
            return

        write_json(self, 405, {"error": "Only POST is supported for /api/solve."})

    def do_OPTIONS(self) -> None:  # noqa: N802 (required method name)
        if self.path.split("?")[0] != "/api/solve":
            write_json(self, 404, {"error": "Not found."})
            return

        self.send_response(204)
        self.send_header("Allow", "POST, OPTIONS")
        self.end_headers()

    def log_message(self, format: str, *args: Any) -> None:  # noqa: A003
        # Reduce noisy default HTTP request logs in function output.
        return
