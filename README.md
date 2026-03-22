# CubeVault

A Rubik's Cube scramble and solve timer.

## Solver integration

CubeVault can call Python `rubik-solver` to generate a near-optimal solution for
each scramble.

1. Install Python (3.10+ recommended).
2. Install package: `pip install rubik-solver`
3. (Optional) point CubeVault to a specific interpreter:
   `CUBEVAULT_PYTHON=C:\path\to\python.exe`

When running `vite`/`vite preview`, CubeVault exposes `POST /api/solve` and
executes `solver/solve_scramble.py` through your Python interpreter.
