#pragma once

#include <algorithm>
#include <array>
#include <cstdint>
#include <deque>
#include <stdexcept>
#include <string>
#include <vector>

#include "cube.hpp"
#include "moves.hpp"
#include "tables.hpp"
#include<bits/stdc++.h>

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

inline const std::vector<Move>& phase_moves(Phase phase) {
    static const std::array<std::vector<Move>, 4> moves = {
        all_moves_for_phase(Phase::EdgeOrientation),
        all_moves_for_phase(Phase::CornerOrientationAndSlice),
        all_moves_for_phase(Phase::PermutationReduction),
        all_moves_for_phase(Phase::HalfTurnSolve),
    };
    return moves[static_cast<int>(phase)];
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

inline std::uint64_t permutation_reduction_coord(const Cube& cube) {
    return (((edge_slice_coord(cube) << 8) | corner_tetrad_coord(cube)) << 2) |
           (static_cast<std::uint64_t>(permutation_parity(cube.cp)) << 1) |
           static_cast<std::uint64_t>(permutation_parity(cube.ep));
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
            if (!phase_goal(cube, Phase::CornerOrientationAndSlice)) {
                return false;
            }
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

static constexpr int kOrbitPermutationCount = 24;
static constexpr int kHalfTurnKeySpace =
    kOrbitPermutationCount * kOrbitPermutationCount * kOrbitPermutationCount *
    kOrbitPermutationCount * kOrbitPermutationCount;

template <std::size_t N>
inline int orbit_permutation_index(
    const std::array<std::uint8_t, N>& values,
    const std::array<int, 4>& positions,
    const std::array<int, 4>& orbit
) {
    static constexpr std::array<int, 4> factorial = {6, 2, 1, 1};
    std::array<bool, 4> used = {false, false, false, false};
    int index = 0;

    for (int i = 0; i < 4; ++i) {
        int rank = -1;
        for (int j = 0; j < 4; ++j) {
            if (values[positions[i]] == orbit[j]) {
                rank = j;
                break;
            }
        }
        if (rank < 0 || used[rank]) {
            return -1;
        }

        int smaller_unused = 0;
        for (int j = 0; j < rank; ++j) {
            if (!used[j]) {
                ++smaller_unused;
            }
        }

        index += smaller_unused * factorial[i];
        used[rank] = true;
    }

    return index;
}

inline int half_turn_compact_key(const Cube& cube) {
    static constexpr std::array<int, 4> corner_a = {0, 2, 5, 7};
    static constexpr std::array<int, 4> corner_b = {1, 3, 4, 6};
    static constexpr std::array<int, 4> edge_a = {0, 2, 4, 6};
    static constexpr std::array<int, 4> edge_b = {1, 3, 5, 7};
    static constexpr std::array<int, 4> edge_c = {8, 9, 10, 11};

    const int c0 = orbit_permutation_index(cube.cp, corner_a, corner_a);
    const int c1 = orbit_permutation_index(cube.cp, corner_b, corner_b);
    const int e0 = orbit_permutation_index(cube.ep, edge_a, edge_a);
    const int e1 = orbit_permutation_index(cube.ep, edge_b, edge_b);
    const int e2 = orbit_permutation_index(cube.ep, edge_c, edge_c);
    if (c0 < 0 || c1 < 0 || e0 < 0 || e1 < 0 || e2 < 0) {
        return -1;
    }

    return (((c0 * kOrbitPermutationCount + c1) * kOrbitPermutationCount + e0) *
                kOrbitPermutationCount +
            e1) *
               kOrbitPermutationCount +
           e2;
}

struct MoveCandidate {
    Move move;
    Cube cube;
    int lower_bound;
};

struct HalfTurnSearchNode {
    Cube cube;
    int key;
};

struct HalfTurnParent {
    int parent_key;
    Move move;
    std::uint8_t depth;
};

class HalfTurnMembershipTable {
public:
    HalfTurnMembershipTable() {
        build();
    }

    bool contains(const Cube& cube) const {
        const int key = half_turn_compact_key(cube);
        return key >= 0 && members_[key] != 0;
    }

private:
    std::vector<std::uint8_t> members_;

    void build() {
        const auto& moves = phase_moves(Phase::HalfTurnSolve);
        std::deque<Cube> queue;
        Cube solved;

        members_.assign(kHalfTurnKeySpace, 0);
        members_[half_turn_compact_key(solved)] = 1;
        queue.push_back(solved);

        while (!queue.empty()) {
            const Cube cube = queue.front();
            queue.pop_front();

            for (const auto& move : moves) {
                Cube next = cube;
                next.apply(move);

                const int key = half_turn_compact_key(next);
                if (key < 0 || members_[key] != 0) {
                    continue;
                }

                members_[key] = 1;
                queue.push_back(next);
            }
        }
    }
};

inline const HalfTurnMembershipTable& half_turn_membership_table() {
    static const HalfTurnMembershipTable table;
    return table;
}

class PermutationReductionPruningTable {
public:
    PermutationReductionPruningTable() {
        build();
    }

    int distance(const Cube& cube) const {
        const auto it = distances_.find(permutation_reduction_coord(cube));
        if (it == distances_.end()) {
            return kMissingDistance;
        }
        return it->second;
    }

private:
    static constexpr int kMaxDepth = 15;
    static constexpr int kMissingDistance = 99;
    std::unordered_map<std::uint64_t, std::uint8_t> distances_;

    void build() {
        const auto& moves = phase_moves(Phase::PermutationReduction);
        std::deque<Cube> queue;
        Cube solved;

        distances_.reserve(3000000);
        distances_.emplace(permutation_reduction_coord(solved), 0);
        queue.push_back(solved);

        while (!queue.empty()) {
            const Cube cube = queue.front();
            queue.pop_front();

            const auto current_distance = distance(cube);
            if (current_distance >= kMaxDepth) {
                continue;
            }

            const auto next_distance = static_cast<std::uint8_t>(current_distance + 1);
            for (const auto& move : moves) {
                Cube next = cube;
                next.apply(move);

                const auto key = permutation_reduction_coord(next);
                if (distances_.find(key) != distances_.end()) {
                    continue;
                }

                distances_.emplace(key, next_distance);
                queue.push_back(next);
            }
        }
    }
};

inline const PermutationReductionPruningTable& permutation_reduction_pruning_table() {
    static const PermutationReductionPruningTable table;
    return table;
}

inline std::vector<Move> search_half_turn_phase(const Cube& start, int max_depth) {
    if (start.solved()) {
        return {};
    }

    const int start_key = half_turn_compact_key(start);
    if (start_key < 0) {
        throw std::runtime_error("No path found for G3->G4 half-turn solve");
    }

    const auto& moves = phase_moves(Phase::HalfTurnSolve);
    std::deque<HalfTurnSearchNode> queue;
    std::unordered_map<int, HalfTurnParent> parents;

    parents.reserve(700000);
    parents.emplace(start_key, HalfTurnParent{-1, Move{'\0', 0}, 0});
    queue.push_back(HalfTurnSearchNode{start, start_key});

    // BFS with pruning based on the half-turn membership table.
    while (!queue.empty()) {
        const HalfTurnSearchNode node = queue.front();
        queue.pop_front();

        const auto parent_it = parents.find(node.key);
        if (parent_it == parents.end() || parent_it->second.depth >= max_depth) {
            continue;
        }

        const auto next_depth = static_cast<std::uint8_t>(parent_it->second.depth + 1);
        for (const auto& move : moves) {
            Cube next = node.cube;
            next.apply(move);

            const int key = half_turn_compact_key(next);
            if (key < 0 || parents.find(key) != parents.end()) {
                continue;
            }

            parents.emplace(key, HalfTurnParent{node.key, move, next_depth});
            if (next.solved()) {
                std::vector<Move> path;
                int cursor = key;
                while (cursor != start_key) {
                    const auto it = parents.find(cursor);
                    if (it == parents.end() || it->second.parent_key < 0) {
                        throw std::runtime_error("No path found for G3->G4 half-turn solve");
                    }
                    path.push_back(it->second.move);
                    cursor = it->second.parent_key;
                }
                std::reverse(path.begin(), path.end());
                return path;
            }

            queue.push_back(HalfTurnSearchNode{next, key});
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
    return half_turn_membership_table().contains(cube);
}

inline bool dfs_phase(
    const Cube& cube,
    Phase phase,
    int depth_left,
    char previous_face,
    std::vector<Move>& path,
    std::unordered_map<std::string, int>& failed
) {
    if (accepts_phase_goal(cube, phase)) {
        return true;
    }
    if (depth_left == 0) {
        return false;
    }
    if (phase == Phase::PermutationReduction &&
        permutation_reduction_pruning_table().distance(cube) > depth_left) {
        return false;
    }

    std::string failed_key = full_key(cube);
    failed_key.push_back(previous_face);
    const auto failed_it = failed.find(failed_key);
    if (failed_it != failed.end() && failed_it->second >= depth_left) {
        return false;
    }

    const auto& moves = phase_moves(phase);
    if (phase == Phase::PermutationReduction) {
        std::vector<MoveCandidate> candidates;
        candidates.reserve(moves.size());

        for (const auto& move : moves) {
            if (previous_face != '\0' &&
                (previous_face == move.face || same_axis(previous_face, move.face))) {
                continue;
            }

            Cube next = cube;
            next.apply(move);
            const int lower_bound = permutation_reduction_pruning_table().distance(next);
            if (lower_bound > depth_left - 1) {
                continue;
            }
            candidates.push_back(MoveCandidate{move, next, lower_bound});
        }

        std::sort(candidates.begin(), candidates.end(), [](const auto& left, const auto& right) {
            return left.lower_bound < right.lower_bound;
        });

        for (const auto& candidate : candidates) {
            path.push_back(candidate.move);
            if (dfs_phase(candidate.cube, phase, depth_left - 1, candidate.move.face, path, failed)) {
                return true;
            }
            path.pop_back();
        }

        failed[std::move(failed_key)] = depth_left;
        return false;
    }

    for (const auto& move : moves) {
        if (previous_face != '\0' &&
            (previous_face == move.face || same_axis(previous_face, move.face))) {
            continue;
        }
        Cube next = cube;
        next.apply(move);
        path.push_back(move);
        if (dfs_phase(next, phase, depth_left - 1, move.face, path, failed)) {
            return true;
        }
        path.pop_back();
    }

    failed[std::move(failed_key)] = depth_left;
    return false;
}

inline std::vector<Move> iddfs_phase(const Cube& start, Phase phase, int max_depth) {
    if (phase_goal(start, phase)) {
        return {};
    }
    std::unordered_map<std::string, int> failed;
    failed.reserve(phase == Phase::PermutationReduction ? 1000000 : 50000);
    for (int depth = 1; depth <= max_depth; ++depth) {
        std::vector<Move> path;
        if (dfs_phase(start, phase, depth, '\0', path, failed)) {
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
