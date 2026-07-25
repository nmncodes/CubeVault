#include <exception>
#include <iostream>

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
        std::string cache_dir = ".";
        if (argc > 0) {
            std::string argv0 = argv[0];
            auto pos = argv0.find_last_of("/\\");
            if (pos != std::string::npos) {
                cache_dir = argv0.substr(0, pos);
            }
        }
        thistle::init_tables(cache_dir);
        const std::string scramble_text = argv[1];
        const auto scramble = thistle::parse_algorithm(scramble_text);


        const thistle::ThistlethwaiteSolver solver;
        std::vector<std::string> logs;
        const auto solution = solver.solve_scramble(scramble, logs);
        
        const std::string algorithm = thistle::join_moves(solution);

        std::cout << "{\"ok\":true,\"method\":\"Thistlethwaite\",\"algorithm\":\""
                  << json_escape(algorithm) << "\",\"logs\":[";
        for (std::size_t i = 0; i < logs.size(); ++i) {
            if (i > 0) std::cout << ",";
            std::cout << "\"" << json_escape(logs[i]) << "\"";
        }
        std::cout << "]}\n";
        return 0;
    } catch (const std::exception& exc) {
        std::cout << "{\"ok\":false,\"error\":\"" << json_escape(exc.what()) << "\"}\n";
        return 1;
    }
}

