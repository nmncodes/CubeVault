#!/usr/bin/env python3
"""
Readable Beginner-method solver pipeline.

This module mirrors the staged style used by the CFOP components: solve one
stage at a time with deterministic algorithms, then concatenate all moves.
"""

from __future__ import annotations

import copy
from dataclasses import dataclass

from rubik_solver.Cubie import Cube
from rubik_solver.Move import Move
from rubik_solver.Solver.Beginner import SecondLayerSolver
from rubik_solver.Solver.Beginner import WhiteCrossSolver
from rubik_solver.Solver.Beginner import WhiteFaceSolver
from rubik_solver.Solver.Beginner import YellowCrossSolver
from rubik_solver.Solver.Beginner import YellowFaceSolver


@dataclass
class BeginnerStageResult:
    name: str
    moves: list[str]


class BeginnerMethodSolver:
    """
    Beginner Rubik solver orchestrated as explicit stages.

    Stages:
    1) White cross
    2) White face corners
    3) Second layer edges
    4) Yellow cross
    5) Yellow face / final permutation
    """

    STAGES = (
        ("WhiteCross", WhiteCrossSolver.WhiteCrossSolver),
        ("WhiteFace", WhiteFaceSolver.WhiteFaceSolver),
        ("SecondLayer", SecondLayerSolver.SecondLayerSolver),
        ("YellowCross", YellowCrossSolver.YellowCrossSolver),
        ("YellowFace", YellowFaceSolver.YellowFaceSolver),
    )

    def __init__(self, cube: Cube):
        if not isinstance(cube, Cube):
            raise TypeError(f"Expected Cube, got {cube.__class__.__name__}.")
        self.cube = copy.deepcopy(cube)
        self.stage_results: list[BeginnerStageResult] = []

    def solve(self) -> list[Move]:
        full_solution: list[str] = []
        self.stage_results = []

        for stage_name, stage_solver in self.STAGES:
            stage_moves = [str(move) for move in stage_solver(self.cube).solution()]
            self.stage_results.append(BeginnerStageResult(stage_name, stage_moves))
            full_solution.extend(stage_moves)

        return [Move(move) for move in full_solution]


def solve_beginner_method(cube: Cube) -> list[Move]:
    """Convenience function used by the solver bridge."""
    return BeginnerMethodSolver(cube).solve()
