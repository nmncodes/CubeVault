#pragma once

#include <algorithm>
#include <array>
#include <cstdint>
#include <deque>
#include <stdexcept>
#include <string>
#include <vector>
#include <chrono>
#include <fstream>
#include <iostream>
#include <unordered_map>

#include "cube.hpp"
#include "moves.hpp"
#include "tables.hpp"

namespace thistle {

struct Uint64Hash {
    std::size_t operator()(std::uint64_t x) const {
        x ^= x >> 30;
        x *= 0xbf58476d1ce4e5b9ULL;
        x ^= x >> 27;
        x *= 0x94d049bb133111ebULL;
        x ^= x >> 31;
        return static_cast<std::size_t>(x);
    }
};

struct CubeStateKey {
    std::uint64_t a;
    std::uint64_t b;

    bool operator==(const CubeStateKey& other) const {
        return a == other.a && b == other.b;
    }
};

struct CubeStateHash {
    std::size_t operator()(const CubeStateKey& k) const {
        std::uint64_t x = k.a ^ (k.b + 0x9e3779b97f4a7c15ULL + (k.a << 6) + (k.a >> 2));
        x ^= x >> 30;
        x *= 0xbf58476d1ce4e5b9ULL;
        x ^= x >> 27;
        x *= 0x94d049bb133111ebULL;
        x ^= x >> 31;
        return static_cast<std::size_t>(x);
    }
};

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

inline int corner_slice_compact_key(const Cube& cube) {
    return (static_cast<int>(corner_orientation_coord(cube)) << 12) |
           static_cast<int>(slice_mask_coord(cube));
}

struct MoveCandidate {
    Move move;
    Cube cube;
    int lower_bound;
};

static std::string g_cache_dir = ".";

class HalfTurnPruningTable {
public:
    static constexpr int kMissingDistance = 99;

    HalfTurnPruningTable() {
        if (!load(g_cache_dir + "/halfturn.bin")) {
            build();
            save(g_cache_dir + "/halfturn.bin");
        }
    }

    int distance(const Cube& cube) const {
        const int key = half_turn_compact_key(cube);
        if (key < 0) return kMissingDistance;
        return distances_[key];
    }

private:
    std::vector<std::uint8_t> distances_;

    bool load(const std::string& path) {
        std::ifstream f(path, std::ios::binary);
        if (!f) return false;
        distances_.resize(kHalfTurnKeySpace);
        f.read(reinterpret_cast<char*>(distances_.data()), distances_.size());
        return f.good();
    }

    void save(const std::string& path) const {
        std::ofstream f(path, std::ios::binary);
        if (f) {
            f.write(reinterpret_cast<const char*>(distances_.data()), distances_.size());
        }
    }

    void build() {
        auto start = std::chrono::high_resolution_clock::now();
        const auto& moves = phase_moves(Phase::HalfTurnSolve);
        std::deque<Cube> queue;
        Cube solved;

        distances_.assign(kHalfTurnKeySpace, kMissingDistance);
        distances_[half_turn_compact_key(solved)] = 0;
        queue.push_back(solved);

        while (!queue.empty()) {
            const Cube cube = queue.front();
            queue.pop_front();
            
            const int current_dist = distance(cube);
            const auto next_distance = static_cast<std::uint8_t>(current_dist + 1);

            for (const auto& move : moves) {
                Cube next = cube;
                next.apply(move);

                const int key = half_turn_compact_key(next);
                if (key < 0 || distances_[key] != kMissingDistance) {
                    continue;
                }

                distances_[key] = next_distance;
                queue.push_back(next);
            }
        }
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double, std::milli> ms = end - start;
        std::cerr << "[Thistlethwaite] Built HalfTurnPruningTable in " << ms.count() << " ms\n";
    }
};

inline const HalfTurnPruningTable& half_turn_pruning_table() {
    static const HalfTurnPruningTable table;
    return table;
}

class CornerOrientationSlicePruningTable {
public:
    static constexpr int kMissingDistance = 99;
    static constexpr int kKeySpace = 8957952;

    CornerOrientationSlicePruningTable() {
        if (!load(g_cache_dir + "/cornerslice.bin")) {
            build();
            save(g_cache_dir + "/cornerslice.bin");
        }
    }

    int distance(const Cube& cube) const {
        const int key = corner_slice_compact_key(cube);
        return distances_[key];
    }

private:
    std::vector<std::uint8_t> distances_;

    bool load(const std::string& path) {
        std::ifstream f(path, std::ios::binary);
        if (!f) return false;
        distances_.resize(kKeySpace);
        f.read(reinterpret_cast<char*>(distances_.data()), distances_.size());
        return f.good();
    }

    void save(const std::string& path) const {
        std::ofstream f(path, std::ios::binary);
        if (f) {
            f.write(reinterpret_cast<const char*>(distances_.data()), distances_.size());
        }
    }

    void build() {
        auto start = std::chrono::high_resolution_clock::now();
        const auto& moves = phase_moves(Phase::CornerOrientationAndSlice);
        std::deque<Cube> queue;
        Cube solved;

        distances_.assign(kKeySpace, kMissingDistance);
        distances_[corner_slice_compact_key(solved)] = 0;
        queue.push_back(solved);

        while (!queue.empty()) {
            const Cube cube = queue.front();
            queue.pop_front();
            
            const int current_dist = distance(cube);
            const auto next_distance = static_cast<std::uint8_t>(current_dist + 1);

            for (const auto& move : moves) {
                Cube next = cube;
                next.apply(move);

                const int key = corner_slice_compact_key(next);
                if (distances_[key] != kMissingDistance) {
                    continue;
                }

                distances_[key] = next_distance;
                queue.push_back(next);
            }
        }
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double, std::milli> ms = end - start;
        std::cerr << "[Thistlethwaite] Built CornerOrientationSlicePruningTable in " << ms.count() << " ms\n";
    }
};

inline const CornerOrientationSlicePruningTable& corner_slice_pruning_table() {
    static const CornerOrientationSlicePruningTable table;
    return table;
}

class PermutationReductionPruningTable {
public:
    PermutationReductionPruningTable() {
        if (!load(g_cache_dir + "/permred.bin")) {
            build();
            save(g_cache_dir + "/permred.bin");
        }
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
    std::unordered_map<std::uint64_t, std::uint8_t, Uint64Hash> distances_;

    bool load(const std::string& path) {
        std::ifstream f(path, std::ios::binary);
        if (!f) return false;
        std::uint32_t count;
        if (!f.read(reinterpret_cast<char*>(&count), sizeof(count))) return false;
        distances_.reserve(count);
        for (std::uint32_t i = 0; i < count; ++i) {
            std::uint64_t key; std::uint8_t val;
            f.read(reinterpret_cast<char*>(&key), sizeof(key));
            f.read(reinterpret_cast<char*>(&val), sizeof(val));
            distances_.emplace(key, val);
        }
        return f.good();
    }

    void save(const std::string& path) const {
        std::ofstream f(path, std::ios::binary);
        if (!f) return;
        std::uint32_t count = distances_.size();
        f.write(reinterpret_cast<const char*>(&count), sizeof(count));
        for (const auto& kv : distances_) {
            f.write(reinterpret_cast<const char*>(&kv.first), sizeof(kv.first));
            f.write(reinterpret_cast<const char*>(&kv.second), sizeof(kv.second));
        }
    }

    void build() {
        auto start = std::chrono::high_resolution_clock::now();
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
        auto end = std::chrono::high_resolution_clock::now();
        std::chrono::duration<double, std::milli> ms = end - start;
        std::cerr << "[Thistlethwaite] Built PermutationReductionPruningTable in " << ms.count() << " ms\n";
    }
};

inline const PermutationReductionPruningTable& permutation_reduction_pruning_table() {
    static const PermutationReductionPruningTable table;
    return table;
}

inline void init_tables(const std::string& cache_dir) {
    g_cache_dir = cache_dir;
    corner_slice_pruning_table();
    permutation_reduction_pruning_table();
    half_turn_pruning_table();
}

inline bool accepts_phase_goal(const Cube& cube, Phase phase) {
    if (!phase_goal(cube, phase)) {
        return false;
    }
    if (phase != Phase::PermutationReduction) {
        return true;
    }
    return half_turn_pruning_table().distance(cube) != HalfTurnPruningTable::kMissingDistance;
}

inline CubeStateKey get_phase_state_key(const Cube& cube, Phase phase, char previous_face) {
    if (phase == Phase::PermutationReduction) {
        std::uint64_t a = 0;
        std::uint64_t b = 0;
        
        for (int i=0; i<8; ++i) a = (a << 3) | cube.cp[i];
        for (int i=0; i<8; ++i) a = (a << 2) | cube.co[i];
        for (int i=0; i<6; ++i) a = (a << 4) | cube.ep[i];
        
        for (int i=6; i<12; ++i) b = (b << 4) | cube.ep[i];
        for (int i=0; i<12; ++i) b = (b << 1) | cube.eo[i];
        
        int face_idx = 0;
        switch (previous_face) {
            case 'L': face_idx = 1; break;
            case 'R': face_idx = 2; break;
            case 'F': face_idx = 3; break;
            case 'B': face_idx = 4; break;
            case 'U': face_idx = 5; break;
            case 'D': face_idx = 6; break;
        }
        b = (b << 3) | static_cast<std::uint64_t>(face_idx);
        return {a, b};
    }

    std::uint64_t phase_coord = 0;
    switch (phase) {
        case Phase::EdgeOrientation:
            phase_coord = edge_orientation_coord(cube);
            break;
        case Phase::CornerOrientationAndSlice:
            phase_coord = (static_cast<std::uint64_t>(edge_orientation_coord(cube)) << 24) |
                          (static_cast<std::uint64_t>(corner_orientation_coord(cube)) << 12) |
                          slice_mask_coord(cube);
            break;
        case Phase::PermutationReduction:
            // Handled above
            break;
        case Phase::HalfTurnSolve:
            phase_coord = static_cast<std::uint64_t>(half_turn_compact_key(cube));
            break;
    }
    
    int face_idx = 0;
    switch (previous_face) {
        case 'L': face_idx = 1; break;
        case 'R': face_idx = 2; break;
        case 'F': face_idx = 3; break;
        case 'B': face_idx = 4; break;
        case 'U': face_idx = 5; break;
        case 'D': face_idx = 6; break;
    }
    
    return {phase_coord, static_cast<std::uint64_t>(face_idx)};
}

inline bool dfs_phase(
    const Cube& cube,
    Phase phase,
    int depth_left,
    char previous_face,
    std::vector<Move>& path,
    std::unordered_map<CubeStateKey, int, CubeStateHash>& failed
) {
    if (accepts_phase_goal(cube, phase)) {
        return true;
    }
    if (depth_left == 0) {
        return false;
    }
    if (phase == Phase::CornerOrientationAndSlice &&
        corner_slice_pruning_table().distance(cube) > depth_left) {
        return false;
    }
    if (phase == Phase::PermutationReduction &&
        permutation_reduction_pruning_table().distance(cube) > depth_left) {
        return false;
    }
    if (phase == Phase::HalfTurnSolve &&
        half_turn_pruning_table().distance(cube) > depth_left) {
        return false;
    }

    CubeStateKey failed_key = get_phase_state_key(cube, phase, previous_face);
    const auto failed_it = failed.find(failed_key);
    if (failed_it != failed.end() && failed_it->second >= depth_left) {
        return false;
    }

    const auto& moves = phase_moves(phase);
    if (phase == Phase::CornerOrientationAndSlice || phase == Phase::PermutationReduction || phase == Phase::HalfTurnSolve) {
        std::vector<MoveCandidate> candidates;
        candidates.reserve(moves.size());

        for (const auto& move : moves) {
            if (previous_face != '\0' &&
                (previous_face == move.face || same_axis(previous_face, move.face))) {
                continue;
            }

            Cube next = cube;
            next.apply(move);
            int lower_bound = 0;
            if (phase == Phase::CornerOrientationAndSlice) {
                lower_bound = corner_slice_pruning_table().distance(next);
            } else if (phase == Phase::PermutationReduction) {
                lower_bound = permutation_reduction_pruning_table().distance(next);
            } else {
                lower_bound = half_turn_pruning_table().distance(next);
            }
            
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

        failed[failed_key] = depth_left;
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

    failed[failed_key] = depth_left;
    return false;
}

inline std::vector<Move> iddfs_phase(const Cube& start, Phase phase, int max_depth) {
    if (phase_goal(start, phase)) {
        return {};
    }
    std::unordered_map<CubeStateKey, int, CubeStateHash> failed;
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
    return iddfs_phase(start, phase, max_depth);
}

inline void append_and_apply(Cube& cube, std::vector<Move>& solution, const std::vector<Move>& phase_path) {
    for (const auto& move : phase_path) {
        cube.apply(move);
        solution.push_back(move);
    }
}

class ThistlethwaiteSolver {
public:
    std::vector<Move> solve_scramble(const std::vector<Move>& scramble, std::vector<std::string>& logs) const {
        Cube cube = apply_algorithm(Cube{}, scramble);
        std::vector<Move> solution;

        auto run_phase = [&](Phase phase, int depth) {
            auto start_time = std::chrono::high_resolution_clock::now();
            auto path = search_phase(cube, phase, depth);
            auto end_time = std::chrono::high_resolution_clock::now();
            std::chrono::duration<double, std::milli> ms = end_time - start_time;
            
            std::string log_msg = std::string("[Thistlethwaite] ") + 
                                  phase_names[static_cast<int>(phase)] + 
                                  " solved in " + std::to_string(ms.count()) + 
                                  " ms (" + std::to_string(path.size()) + " moves)";
            logs.push_back(log_msg);
            
            append_and_apply(cube, solution, path);
        };

        run_phase(Phase::EdgeOrientation, 7);
        run_phase(Phase::CornerOrientationAndSlice, 13);
        run_phase(Phase::PermutationReduction, 15);
        run_phase(Phase::HalfTurnSolve, 17);

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
