#pragma once

#include <array>

#include "moves.hpp"

namespace thistle {

enum class Phase {
    EdgeOrientation,
    CornerOrientationAndSlice,
    PermutationReduction,
    HalfTurnSolve,
};

static const std::array<const char*, 4> phase_names = {
    "G0->G1 edge orientation",
    "G1->G2 corner orientation and UD slice",
    "G2->G3 permutation reduction",
    "G3->G4 half-turn solve",
};

static const std::array<std::array<char, 6>, 4> phase_faces = {{
    {'U', 'D', 'L', 'R', 'F', 'B'},
    {'U', 'D', 'L', 'R', 'F', 'B'},
    {'U', 'D', 'L', 'R', 'F', 'B'},
    {'U', 'D', 'L', 'R', 'F', 'B'},
}};

inline bool allowed_in_phase(const Move& move, Phase phase) {
    switch (phase) {
        case Phase::EdgeOrientation:
            return true;
        case Phase::CornerOrientationAndSlice:
            return move.face != 'F' && move.face != 'B' || move.turns == 2;
        case Phase::PermutationReduction:
            return move.face != 'R' && move.face != 'L' || move.turns == 2;
        case Phase::HalfTurnSolve:
            return move.turns == 2;
    }
    return false;
}

}  // namespace thistle
