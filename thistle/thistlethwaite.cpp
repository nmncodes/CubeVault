#include <exception>
#include <iostream>
#include <string>

#include "moves.hpp"
#include "search.hpp"

namespace {

std::string json_escape(const std::string& input) {
    std::string output;
    output.reserve(input.size());

    for (char c : input) {
        if (c == '\\' || c == '"') {
            output.push_back('\\');
        }
        output.push_back(c);
    }

    return output;
}

}  // namespace

int main(int argc, char** argv) {
    if (argc < 2) {
        std::cout << "{\"ok\":false,\"error\":\"Expected scramble argument.\"}\n";
        return 2;
    }

    

    try {
        const std::string scramble_text = argv[1];
        const auto scramble = thistle::parse_algorithm(scramble_text);


        const thistle::ThistlethwaiteSolver solver;


        const auto solution = solver.solve_scramble(scramble);

        
        const std::string algorithm = thistle::join_moves(solution);

        std::cout << "{\"ok\":true,\"method\":\"Thistlethwaite\",\"algorithm\":\""
                  << json_escape(algorithm) << "\"}\n";
        return 0;
    } catch (const std::exception& exc) {
        std::cout << "{\"ok\":false,\"error\":\"" << json_escape(exc.what()) << "\"}\n";
        return 1;
    }
}

