#!/usr/bin/env python3
"""
CubeVault solver bridge.
Input: scramble string (WCA notation, e.g. "R U R' U'")
Output: JSON line with Kociemba/CFOP/Beginner solution from rubik-solver.
"""

from __future__ import annotations

import collections
import collections.abc
import json
import os
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path
from typing import Any

for _name in (
    "Mapping",
    "MutableMapping",
    "Sequence",
    "MutableSequence",
    "Set",
    "MutableSet",
    "Iterable",
):
    if not hasattr(collections, _name):
        setattr(collections, _name, getattr(collections.abc, _name))

MOVE_PATTERN = re.compile(r"^[FBRLUD](?:2|')?$")
ALLOWED_METHODS = {"Kociemba", "CFOP", "Beginner", "Thistlethwaite"}
PROJECT_ROOT = Path(__file__).resolve().parents[1]
THISTLE_SOURCE = PROJECT_ROOT / "thistle" / "thistlethwaite.cpp"
THISTLE_BUILD_DIR = PROJECT_ROOT / "thistle" / "build"
THISTLE_BINARY = THISTLE_BUILD_DIR / (
    "thistlethwaite.exe" if os.name == "nt" else "thistlethwaite"
)
THISTLE_CACHE_BINARY = THISTLE_BUILD_DIR / (
    "thistlethwaite.cached.exe" if os.name == "nt" else "thistlethwaite.cached"
)
_RUBIK_MODULES: tuple[Any, Any, Any] | None = None


def load_rubik_solver() -> tuple[Any, Any, Any]:
    global _RUBIK_MODULES

    if _RUBIK_MODULES is not None:
        return _RUBIK_MODULES

    try:
        from rubik_solver import utils  # type: ignore
        from rubik_solver.Cubie import Cube  # type: ignore
        from rubik_solver.Move import Move  # type: ignore
    except ModuleNotFoundError as exc:
        raise RuntimeError(
            "rubik-solver is required for CFOP/Kociemba/Beginner methods in this Python runtime."
        ) from exc

    _RUBIK_MODULES = (utils, Cube, Move)
    return _RUBIK_MODULES


def _thistle_build_output_path() -> Path:
    if os.name == "nt":
        return THISTLE_BUILD_DIR / f"thistlethwaite.{os.getpid()}.{time.time_ns()}.exe"
    return THISTLE_BUILD_DIR / f"thistlethwaite.{os.getpid()}.{time.time_ns()}"


def normalize_tokens(scramble: str) -> list[str]:
    normalized: list[str] = []
    for raw in scramble.replace(chr(0x2019), "'").split():
        token = raw.strip().upper()
        if not token:
            continue
        if not MOVE_PATTERN.match(token):
            raise ValueError(
                f"Invalid move '{raw}'. Allowed moves: F B R L U D with optional ' or 2."
            )
        normalized.append(token)

    if not normalized:
        raise ValueError("Scramble is empty.")

    return normalized


def ensure_thistle_binary() -> Path:
    thistle_sources = [
        THISTLE_SOURCE,
        *PROJECT_ROOT.glob("thistle/*.hpp"),
    ]
    if THISTLE_CACHE_BINARY.exists() and THISTLE_CACHE_BINARY.stat().st_mtime >= max(
        source.stat().st_mtime for source in thistle_sources
    ):
        runtime_binary = _thistle_build_output_path()
        shutil.copy2(THISTLE_CACHE_BINARY, runtime_binary)
        return runtime_binary

    compiler = shutil.which("g++") or shutil.which("clang++")
    if compiler is None:
        raise RuntimeError(
            "Thistlethwaite C++ solver needs g++ or clang++ to build."
        )

    THISTLE_BUILD_DIR.mkdir(parents=True, exist_ok=True)
    build_output = THISTLE_CACHE_BINARY
    completed = subprocess.run(
        [
            compiler,
            "-std=c++17",
            "-O2",
            str(THISTLE_SOURCE),
            "-o",
            str(build_output),
        ],
        capture_output=True,
        text=True,
        check=False,
    )

    if completed.returncode != 0:
        raise RuntimeError(
            "Failed to build Thistlethwaite C++ solver: "
            + (completed.stderr.strip() or completed.stdout.strip())
        )

    runtime_binary = _thistle_build_output_path()
    shutil.copy2(THISTLE_CACHE_BINARY, runtime_binary)
    return runtime_binary


def solve_with_thistlethwaite(tokens: list[str]) -> list[str]:
    binary = ensure_thistle_binary()
    try:
        completed = subprocess.run(
            [str(binary), " ".join(tokens)],
            capture_output=True,
            text=True,
            timeout=300,
            check=False,
        )
    finally:
        try:
            if binary != THISTLE_BINARY and binary != THISTLE_CACHE_BINARY:
                binary.unlink(missing_ok=True)
        except OSError:
            pass

    output_lines = [
        line.strip() for line in completed.stdout.splitlines() if line.strip()
    ]
    if completed.returncode != 0 or not output_lines:
        if output_lines:
            try:
                error_payload = json.loads(output_lines[-1])
                if isinstance(error_payload, dict) and isinstance(
                    error_payload.get("error"), str
                ):
                    raise RuntimeError(error_payload["error"])
            except json.JSONDecodeError:
                pass
        raise RuntimeError(
            completed.stderr.strip()
            or (output_lines[-1] if output_lines else "Thistlethwaite solver failed.")
        )

    payload = json.loads(output_lines[-1])
    if not payload.get("ok"):
        raise RuntimeError(payload.get("error") or "Thistlethwaite solver failed.")

    algorithm = payload.get("algorithm")
    if not isinstance(algorithm, str):
        raise RuntimeError("Thistlethwaite solver returned malformed payload.")

    solution_tokens = normalize_tokens(algorithm) if algorithm.strip() else []
    return solution_tokens


def solve_scramble(scramble: str, method: str) -> dict[str, object]:
    if method not in ALLOWED_METHODS:
        raise ValueError(
            f"Invalid method '{method}'. Use one of: {', '.join(sorted(ALLOWED_METHODS))}."
        )

    tokens = normalize_tokens(scramble)

    started = time.perf_counter()
    if method == "Thistlethwaite":
        solution_tokens = solve_with_thistlethwaite(tokens)
    else:
        utils, Cube, Move = load_rubik_solver()
        cube = Cube()
        for token in tokens:
            cube.move(Move(token))
        cube_state = cube.to_naive_cube().get_cube()
        solution_moves = utils.solve(cube_state, method)
        solution_tokens = [str(move) for move in solution_moves]

    # Best effort state generation for Thistlethwaite when rubik_solver is unavailable.
    states: list[str] = []
    try:
        _, Cube, Move = load_rubik_solver()
        cube = Cube()
        for token in tokens:
            cube.move(Move(token))

        cube_state = cube.to_naive_cube().get_cube()
        states = [cube_state]

        for token in solution_tokens:
            cube.move(Move(token))
            states.append(cube.to_naive_cube().get_cube())
    except RuntimeError:
        if method != "Thistlethwaite":
            raise

    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

    return {
        "ok": True,
        "method": method,
        "algorithm": " ".join(solution_tokens),
        "moveCount": len(solution_tokens),
        "states": states,
        "elapsedMs": elapsed_ms,
    }


def main() -> int:
    if len(sys.argv) < 2:
        print(json.dumps({"ok": False, "error": "Expected scramble argument."}))
        return 2

    scramble = sys.argv[1]
    method = sys.argv[2] if len(sys.argv) > 2 else "CFOP"

    try:
        payload = solve_scramble(scramble, method)
        print(json.dumps(payload))
        return 0
    except Exception as exc:  # pragma: no cover - defensive bridge code
        print(json.dumps({"ok": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
