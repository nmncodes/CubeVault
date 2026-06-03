#pragma once

#include <algorithm>
#include <cstdint>
#include <deque>
#include <stdexcept>
#include <string>
#include <unordered_set>
#include <vector>

#include "cube.hpp"
#include "moves.hpp"
#include "tables.hpp"

namespace thistle {

inline std::vector<Move> all_moves_for_phase(Phase phase) {
    std::vector<Move> moves;
    for (char face : {'L', 'R', 'F', 'B', 'U', 'D'}) {
        for (int turns : {1, 2, 3}) {
            Move move{face, turns};
            if (allowed_in_phase(move, phase)) {
                moves.push_back(move);
            }
        }
    }
    return moves;
}

inline std::uint64_t edge_orientation_coord(const Cube& cube) {
    std::uint64_t value = 0;
    for (int i = 0; i < 11; ++i) {
        value |= static_cast<std::uint64_t>(cube.eo[i]) << i;
    }
    return value;
}

inline std::uint64_t corner_orientation_coord(const Cube& cube) {
    std::uint64_t value = 0;
    for (int i = 0; i < 7; ++i) {
        value = value * 3 + cube.co[i];
    }
    return value;
}

inline std::uint64_t slice_mask_coord(const Cube& cube) {
    std::uint64_t mask = 0;
    for (int i = 0; i < 12; ++i) {
        if (cube.ep[i] >= 8) {
            mask |= 1ULL << i;
        }
    }
    return mask;
}

inline std::uint64_t edge_slice_coord(const Cube& cube) {
    std::uint64_t coord = 0;
    for (int i = 0; i < 12; ++i) {
        int slice = 0;
        if (cube.ep[i] == 1 || cube.ep[i] == 3 || cube.ep[i] == 5 || cube.ep[i] == 7) {
            slice = 1;
        } else if (cube.ep[i] >= 8) {
            slice = 2;
        }
        coord = coord * 3 + static_cast<std::uint64_t>(slice);
    }
    return coord;
}

inline bool same_tetrad(int piece, int position) {
    const bool piece_tetrad = piece == 0 || piece == 2 || piece == 5 || piece == 7;
    const bool position_tetrad = position == 0 || position == 2 || position == 5 || position == 7;
    return piece_tetrad == position_tetrad;
}

template <std::size_t N>
inline int permutation_parity(const std::array<std::uint8_t, N>& values) {
    int parity = 0;
    for (std::size_t i = 0; i < N; ++i) {
        for (std::size_t j = i + 1; j < N; ++j) {
            if (values[i] > values[j]) {
                parity ^= 1;
            }
        }
    }
    return parity;
}

inline std::uint64_t corner_tetrad_coord(const Cube& cube) {
    std::uint64_t mask = 0;
    for (int i = 0; i < 8; ++i) {
        if (!same_tetrad(cube.cp[i], i)) {
            mask |= 1ULL << i;
        }
    }
    return mask;
}

inline std::string full_key(const Cube& cube) {
    std::string key;
    key.reserve(40);
    for (auto value : cube.cp) key.push_back(static_cast<char>('A' + value));
    for (auto value : cube.co) key.push_back(static_cast<char>('0' + value));
    for (auto value : cube.ep) key.push_back(static_cast<char>('A' + value));
    for (auto value : cube.eo) key.push_back(static_cast<char>('0' + value));
    return key;
}

inline std::string phase_key(const Cube& cube, Phase phase) {
    switch (phase) {
        case Phase::EdgeOrientation:
            return std::to_string(edge_orientation_coord(cube));
        case Phase::CornerOrientationAndSlice:
            return std::to_string(edge_orientation_coord(cube)) + ":" +
                   std::to_string(corner_orientation_coord(cube)) + ":" +
                   std::to_string(slice_mask_coord(cube));
        case Phase::PermutationReduction:
            return std::to_string(edge_slice_coord(cube)) + ":" +
                   std::to_string(corner_tetrad_coord(cube));
        case Phase::HalfTurnSolve:
            return full_key(cube);
    }
    return full_key(cube);
}

inline bool phase_goal(const Cube& cube, Phase phase) {
    switch (phase) {
        case Phase::EdgeOrientation:
            return std::all_of(cube.eo.begin(), cube.eo.end(), [](std::uint8_t value) {
                return value == 0;
            });
        case Phase::CornerOrientationAndSlice:
            return phase_goal(cube, Phase::EdgeOrientation) &&
                   std::all_of(cube.co.begin(), cube.co.end(), [](std::uint8_t value) {
                       return value == 0;
                   }) &&
                   ((slice_mask_coord(cube) & 0x0F00ULL) == 0x0F00ULL);
        case Phase::PermutationReduction:
            for (int i = 0; i < 8; ++i) {
                if (!same_tetrad(cube.cp[i], i)) {
                    return false;
                }
            }
            return edge_slice_coord(cube) == edge_slice_coord(Cube{}) &&
                   permutation_parity(cube.cp) == 0 &&
                   permutation_parity(cube.ep) == 0;
        case Phase::HalfTurnSolve:
            return cube.solved();
    }
    return false;
}

inline bool same_axis(char a, char b) {
    return (a == 'U' || a == 'D') && (b == 'U' || b == 'D') ||
           (a == 'L' || a == 'R') && (b == 'L' || b == 'R') ||
           (a == 'F' || a == 'B') && (b == 'F' || b == 'B');
}

struct SearchNode {
    Cube cube;
    std::vector<Move> path;
};

inline std::vector<Move> search_half_turn_phase(const Cube& start, int max_depth) {
    if (start.solved()) {
        return {};
    }

    const auto moves = all_moves_for_phase(Phase::HalfTurnSolve);
    std::deque<SearchNode> queue;
    std::unordered_set<std::string> visited;
    queue.push_back(SearchNode{start, {}});
    visited.insert(full_key(start));
    const std::size_t max_visited = 800000;

    while (!queue.empty()) {
        SearchNode node = queue.front();
        queue.pop_front();

        if (static_cast<int>(node.path.size()) >= max_depth) {
            continue;
        }

        for (const auto& move : moves) {
            if (!node.path.empty()) {
                const auto previous = node.path.back();
                if (previous.face == move.face || same_axis(previous.face, move.face)) {
                    continue;
                }
            }

            SearchNode next = node;
            next.cube.apply(move);
            next.path.push_back(move);
            const auto key = full_key(next.cube);
            if (!visited.insert(key).second) {
                continue;
            }
            if (next.cube.solved()) {
                return next.path;
            }
            if (visited.size() > max_visited) {
                throw std::runtime_error("half-turn subgroup search limit reached");
            }
            queue.push_back(next);
        }
    }

    throw std::runtime_error("No path found for G3->G4 half-turn solve");
}

inline bool accepts_phase_goal(const Cube& cube, Phase phase) {
    if (!phase_goal(cube, phase)) {
        return false;
    }
    if (phase != Phase::PermutationReduction) {
        return true;
    }
    try {
        (void)search_half_turn_phase(cube, 17);
        return true;
    } catch (const std::exception&) {
        return false;
    }
}

inline bool dfs_phase(
    const Cube& cube,
    Phase phase,
    int depth_left,
    char previous_face,
    std::vector<Move>& path
) {
    if (accepts_phase_goal(cube, phase)) {
        return true;
    }
    if (depth_left == 0) {
        return false;
    }

    const auto moves = all_moves_for_phase(phase);
    for (const auto& move : moves) {
        if (previous_face != '\0' &&
            (previous_face == move.face || same_axis(previous_face, move.face))) {
            continue;
        }
        Cube next = cube;
        next.apply(move);
        path.push_back(move);
        if (dfs_phase(next, phase, depth_left - 1, move.face, path)) {
            return true;
        }
        path.pop_back();
    }
    return false;
}

inline std::vector<Move> iddfs_phase(const Cube& start, Phase phase, int max_depth) {
    if (phase_goal(start, phase)) {
        return {};
    }
    for (int depth = 1; depth <= max_depth; ++depth) {
        std::vector<Move> path;
        if (dfs_phase(start, phase, depth, '\0', path)) {
            return path;
        }
    }
    throw std::runtime_error(std::string("No path found for ") + phase_names[static_cast<int>(phase)]);
}

inline std::vector<Move> search_phase(const Cube& start, Phase phase, int max_depth) {
    if (phase != Phase::HalfTurnSolve) {
        return iddfs_phase(start, phase, max_depth);
    }

    return search_half_turn_phase(start, max_depth);
}

inline void append_and_apply(Cube& cube, std::vector<Move>& solution, const std::vector<Move>& phase_path) {
    for (const auto& move : phase_path) {
        cube.apply(move);
        solution.push_back(move);
    }
}

class ThistlethwaiteSolver {
public:
    std::vector<Move> solve_scramble(const std::vector<Move>& scramble) const {
        Cube cube = apply_algorithm(Cube{}, scramble);
        std::vector<Move> solution;

        append_and_apply(cube, solution, search_phase(cube, Phase::EdgeOrientation, 7));
        append_and_apply(cube, solution, search_phase(cube, Phase::CornerOrientationAndSlice, 13));
        append_and_apply(cube, solution, search_phase(cube, Phase::PermutationReduction, 15));
        append_and_apply(cube, solution, search_phase(cube, Phase::HalfTurnSolve, 17));

        if (!cube.solved()) {
            throw std::runtime_error("Thistlethwaite phase search ended without solving the cube.");
        }
        if (solution.size() > 52) {
            throw std::runtime_error("Thistlethwaite solution exceeded 52 moves.");
        }
        return solution;
    }
};

}  // namespace thistle
