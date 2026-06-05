#pragma once

#include <algorithm>
#include <cctype>
#include <stdexcept>
#include <string>
#include <vector>
#include <bits/stdc++.h>

using namespace std ; 

namespace thistle {

struct Move {
    char face;
    int turns;
};

inline bool is_face(char c) {
    return c == 'U' || c == 'D' || c == 'L' || c == 'R' || c == 'F' || c == 'B';
}

inline Move parse_move(const std::string& token) {
    if (token.empty() || token.size() > 2) {
        throw std::invalid_argument("Invalid move token: " + token);
    }

    char face = static_cast<char>(std::toupper(static_cast<unsigned char>(token[0])));
    if (!is_face(face)) {
        throw std::invalid_argument("Invalid move face: " + token);
    }

    int turns = 1;
    if (token.size() == 2) {
        if (token[1] == '2') {
            turns = 2;
        } else if (token[1] == '\'') {
            turns = 3;
        } else {
            throw std::invalid_argument("Invalid move suffix: " + token);
        }
    }

    return Move{face, turns};
}

inline std::string move_to_string(const Move& move) {
    std::string token(1, move.face);
    if (move.turns == 2) {
        token.push_back('2');
    } else if (move.turns == 3) {
        token.push_back('\'');
    }
    return token;
}

inline Move inverse_move(const Move& move) {
    if (move.turns == 2) {
        return move;
    }
    return Move{move.face, 4 - move.turns};
}

inline std::vector<Move> parse_algorithm(const std::string& algorithm) {
    std::vector<Move> moves;
    std::string token;

    for (char c : algorithm) {
        const unsigned char uc = static_cast<unsigned char>(c);
        if (std::isspace(uc)) {
            if (!token.empty()) {
                moves.push_back(parse_move(token));
                token.clear();
            }
            continue;
        }
        token.push_back(c == '\xE2' ? '\'' : c);
    }

    if (!token.empty()) {
        moves.push_back(parse_move(token));
    }

    return moves;
}

inline std::vector<Move> inverse_algorithm(const std::vector<Move>& moves) {
    std::vector<Move> solution;
    solution.reserve(moves.size());

    for (auto it = moves.rbegin(); it != moves.rend(); ++it) {
        solution.push_back(inverse_move(*it));
    }

    return solution;
}

inline std::string join_moves(const std::vector<Move>& moves) {
    std::string output;
    for (std::size_t i = 0; i < moves.size(); ++i) {
        if (i > 0) {
            output.push_back(' ');
        }
        output += move_to_string(moves[i]);
    }
    return output;
}

}  // namespace thistle
