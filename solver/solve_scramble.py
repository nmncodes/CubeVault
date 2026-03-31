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
import re
import sys
import time

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

from rubik_solver import utils  # type: ignore  # noqa: E402
from rubik_solver.Cubie import Cube  # type: ignore  # noqa: E402
from rubik_solver.Move import Move  # type: ignore  # noqa: E402

MOVE_PATTERN = re.compile(r"^[FBRLUD](?:2|')?$")
ALLOWED_METHODS = {"Kociemba", "CFOP", "Beginner"}


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


def solve_scramble(scramble: str, method: str) -> dict[str, object]:
    if method not in ALLOWED_METHODS:
        raise ValueError(
            f"Invalid method '{method}'. Use one of: {', '.join(sorted(ALLOWED_METHODS))}."
        )

    tokens = normalize_tokens(scramble)
    cube = Cube()

    for token in tokens:
        cube.move(Move(token))

    cube_state = cube.to_naive_cube().get_cube()

    started = time.perf_counter()
    solution_moves = utils.solve(cube_state, method)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)

    solution_tokens = [str(move) for move in solution_moves]
    states = [cube_state]

    for move in solution_moves:
        cube.move(move)
        states.append(cube.to_naive_cube().get_cube())

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
