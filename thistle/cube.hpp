#pragma once

#include <algorithm>
#include <array>
#include <cstdint>

#include "moves.hpp"

namespace thistle {

// Corners: URF, UFL, ULB, UBR, DFR, DLF, DBL, DRB
// Edges:   UR, UF, UL, UB, DR, DF, DL, DB, FR, FL, BL, BR
struct Cube {
    std::array<std::uint8_t, 8> cp{};
    std::array<std::uint8_t, 8> co{};
    std::array<std::uint8_t, 12> ep{};
    std::array<std::uint8_t, 12> eo{};

    Cube() {
        for (std::uint8_t i = 0; i < cp.size(); ++i) {
            cp[i] = i;
        }
        for (std::uint8_t i = 0; i < ep.size(); ++i) {
            ep[i] = i;
        }
    }

    bool solved() const {
        for (std::uint8_t i = 0; i < cp.size(); ++i) {
            if (cp[i] != i || co[i] != 0) {
                return false;
            }
        }
        for (std::uint8_t i = 0; i < ep.size(); ++i) {
            if (ep[i] != i || eo[i] != 0) {
                return false;
            }
        }
        return true;
    }

    void apply(const Move& move) {
        for (int i = 0; i < move.turns; ++i) {
            apply_quarter(move.face);
        }
    }

private:
    void cycle_corners(int a, int b, int c, int d) {
        const auto tcp = cp[a];
        const auto tco = co[a];
        cp[a] = cp[d]; co[a] = co[d];
        cp[d] = cp[c]; co[d] = co[c];
        cp[c] = cp[b]; co[c] = co[b];
        cp[b] = tcp;   co[b] = tco;
    }

    void cycle_edges(int a, int b, int c, int d) {
        const auto tep = ep[a];
        const auto teo = eo[a];
        ep[a] = ep[d]; eo[a] = eo[d];
        ep[d] = ep[c]; eo[d] = eo[c];
        ep[c] = ep[b]; eo[c] = eo[b];
        ep[b] = tep;   eo[b] = teo;
    }

    void twist_corners(const std::array<int, 4>& positions, const std::array<int, 4>& delta) {
        for (std::size_t i = 0; i < positions.size(); ++i) {
            co[positions[i]] = static_cast<std::uint8_t>((co[positions[i]] + delta[i]) % 3);
        }
    }

    void flip_edges(const std::array<int, 4>& positions) {
        for (int position : positions) {
            eo[position] ^= 1;
        }
    }

    void apply_quarter(char face) {
        switch (face) {
            case 'U':
                cycle_corners(0, 1, 2, 3);
                cycle_edges(0, 1, 2, 3);
                break;
            case 'D':
                cycle_corners(4, 7, 6, 5);
                cycle_edges(4, 7, 6, 5);
                break;
            case 'R':
                cycle_corners(0, 3, 7, 4);
                cycle_edges(0, 11, 4, 8);
                twist_corners({0, 3, 7, 4}, {2, 1, 2, 1});
                break;
            case 'L':
                cycle_corners(1, 5, 6, 2);
                cycle_edges(2, 9, 6, 10);
                twist_corners({1, 5, 6, 2}, {1, 2, 1, 2});
                break;
            case 'F':
                cycle_corners(0, 4, 5, 1);
                cycle_edges(1, 8, 5, 9);
                twist_corners({0, 4, 5, 1}, {1, 2, 1, 2});
                flip_edges({1, 8, 5, 9});
                break;
            case 'B':
                cycle_corners(2, 6, 7, 3);
                cycle_edges(3, 10, 7, 11);
                twist_corners({2, 6, 7, 3}, {1, 2, 1, 2});
                flip_edges({3, 10, 7, 11});
                break;
        }
    }
};

inline Cube apply_algorithm(Cube cube, const std::vector<Move>& moves) {
    for (const auto& move : moves) {
        cube.apply(move);
    }
    return cube;
}

}  // namespace thistle
