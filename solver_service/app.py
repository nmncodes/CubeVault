from __future__ import annotations

import os

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from solver.solve_scramble import ALLOWED_METHODS, solve_scramble


class SolveRequest(BaseModel):
    scramble: str
    method: str = "Kociemba"


def parse_allowed_origins() -> list[str]:
    raw = os.getenv("ALLOWED_ORIGINS", "*").strip()
    if raw == "*" or raw == "":
        return ["*"]
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


app = FastAPI(title="CubeVault Solver Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=parse_allowed_origins(),
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    allow_credentials=False,
)


@app.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@app.post("/api/solve")
def solve(payload: SolveRequest) -> dict[str, object]:
    scramble = payload.scramble.strip()
    method = payload.method

    if not scramble:
        raise HTTPException(status_code=400, detail="Missing scramble.")

    if method not in ALLOWED_METHODS:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid method. Use one of: {', '.join(sorted(ALLOWED_METHODS))}.",
        )

    try:
        result = solve_scramble(scramble, method)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=str(exc)) from exc

    return {
        "method": result.get("method"),
        "algorithm": result.get("algorithm"),
        "moveCount": result.get("moveCount"),
        "states": result.get("states"),
        "elapsedMs": result.get("elapsedMs"),
        "backend": "render-python",
    }
