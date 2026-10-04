// main.cpp - the program the Node backend runs.
//
// Build:   g++ -std=c++11 -o engine main.cpp      (or: cd backend && npm run build:cpp)
//
// Usage (the backend sends data on standard input and reads the answer from standard output):
//   ./engine test        run the built-in tests
//   ./engine conflict    check one new match against existing matches
//   ./engine pairs       find all clashing pairs (dashboard)
//   ./engine cheapest    pick the cheapest flight
//   ./engine fastest     pick the fastest flight
//
// Input formats are described above each run... function below.

#include "TravelAndScheduleEngine.cpp"

typedef TravelAndScheduleEngine Engine;

// ------------------------------------------------------------------
// conflict
//   input:  newStart newEnd
//           n
//           id start end        (n lines, times like 18:00)
//   output: ids of the matches that overlap separated by spaces, or NONE
// ------------------------------------------------------------------
int runConflict() {
    string newStart, newEnd;
    int n;
    cin >> newStart >> newEnd >> n;

    vector<MatchSlot> existing;
    for (int i = 0; i < n; i++) {
        string id, start, end;
        cin >> id >> start >> end;
        existing.push_back(MatchSlot(id, Engine::toMinutes(start), Engine::toMinutes(end)));
    }

    vector<string> ids = Engine::findConflicts(Engine::toMinutes(newStart), Engine::toMinutes(newEnd), existing);
    if (ids.empty()) {
        cout << "NONE" << endl;
    } else {
        for (size_t i = 0; i < ids.size(); i++) cout << (i ? " " : "") << ids[i];
        cout << endl;
    }
    return 0;
}

// ------------------------------------------------------------------
// pairs
//   input:  n
//           id date teamA teamB start end      (n lines)
//   output: one line per clashing pair "idA idB", or NONE
// ------------------------------------------------------------------
int runPairs() {
    int n;
    cin >> n;

    vector<MatchSlot> matches;
    for (int i = 0; i < n; i++) {
        string id, date, teamA, teamB, start, end;
        cin >> id >> date >> teamA >> teamB >> start >> end;
        matches.push_back(MatchSlot(id, Engine::toMinutes(start), Engine::toMinutes(end), date, teamA, teamB));
    }

    vector<pair<string, string>> found = Engine::findAllConflicts(matches);
    if (found.empty()) {
        cout << "NONE" << endl;
    } else {
        for (const auto& p : found) cout << p.first << " " << p.second << endl;
    }
    return 0;
}

// ------------------------------------------------------------------
// cheapest / fastest
//   input:  n
//           id flightNumber price durationMinutes      (n lines)
//   output: id of the winning flight, or NONE
// ------------------------------------------------------------------
int runFlights(const string& mode) {
    int n;
    cin >> n;

    Engine engine;
    for (int i = 0; i < n; i++) {
        string id, flightNumber;
        int price, duration;
        cin >> id >> flightNumber >> price >> duration;
        engine.addFlight(Flight(flightNumber, "", "", price, duration, 0, id));
    }

    const Flight* best = (mode == "cheapest") ? engine.cheapest() : engine.fastest();
    cout << (best == nullptr ? "NONE" : best->id) << endl;
    return 0;
}

// ------------------------------------------------------------------
// test: simple self-checks. Run with:  ./engine test
// ------------------------------------------------------------------
int passed = 0;
int failed = 0;

void check(const string& name, bool actual, bool expected) {
    if (actual == expected) {
        cout << "  PASS  " << name << endl;
        passed++;
    } else {
        cout << "  FAIL  " << name << endl;
        failed++;
    }
}

int runTests() {
    // Existing match: 18:00 - 20:00
    int existingStart = Engine::toMinutes("18:00");
    int existingEnd = Engine::toMinutes("20:00");

    auto test = [&](const string& name, const string& start, const string& end, bool expected) {
        bool result = Engine::hasConflict(Engine::toMinutes(start), Engine::toMinutes(end), existingStart, existingEnd);
        check(name, result, expected);
    };

    cout << "Match conflict tests (existing match 18:00-20:00)" << endl;
    test("Exact same time        18:00-20:00", "18:00", "20:00", true);
    test("Partial overlap        19:00-21:00", "19:00", "21:00", true);
    test("New starts during      19:00-22:00", "19:00", "22:00", true);
    test("New ends during        17:00-19:00", "17:00", "19:00", true);
    test("Existing inside new    17:00-21:00", "17:00", "21:00", true);
    test("Back-to-back (after)   20:00-22:00", "20:00", "22:00", false);
    test("Back-to-back (before)  16:00-18:00", "16:00", "18:00", false);
    test("Completely separate    10:00-12:00", "10:00", "12:00", false);

    cout << endl << "List and pair tests" << endl;
    vector<MatchSlot> existing;
    existing.push_back(MatchSlot("m1", 1080, 1200, "2026-10-18", "A", "B")); // 18:00-20:00
    existing.push_back(MatchSlot("m2", 1200, 1320, "2026-10-18", "A", "C")); // 20:00-22:00
    vector<string> hits = Engine::findConflicts(Engine::toMinutes("19:00"), Engine::toMinutes("21:00"), existing);
    check("19:00-21:00 clashes with both m1 and m2", hits.size() == 2, true);
    vector<string> none = Engine::findConflicts(Engine::toMinutes("22:00"), Engine::toMinutes("23:00"), existing);
    check("22:00-23:00 clashes with nothing", none.empty(), true);
    check("back-to-back m1/m2 are not a clashing pair", Engine::findAllConflicts(existing).empty(), true);
    existing.push_back(MatchSlot("m3", 1140, 1260, "2026-10-18", "C", "D")); // 19:00-21:00, shares team C with m2 and overlaps m1? no team share
    check("m3 clashes with m2 (shared team C, overlapping time)", Engine::findAllConflicts(existing).size() == 1, true);

    cout << endl << "Flight tests" << endl;
    Engine engine;
    engine.addFlight(Flight("AI101", "Hyderabad", "Mumbai", 4500, 130, 20));
    engine.addFlight(Flight("6E202", "Hyderabad", "Mumbai", 3800, 155, 12));
    engine.addFlight(Flight("UK303", "Hyderabad", "Mumbai", 5200, 115, 8));
    check("Cheapest is 6E202 (3800)", engine.cheapest() != nullptr && engine.cheapest()->flightNumber == "6E202", true);
    check("Fastest is UK303 (115 min)", engine.fastest() != nullptr && engine.fastest()->flightNumber == "UK303", true);
    check("Lookup AI101 by number", engine.findByNumber("AI101") != nullptr, true);
    check("Lookup XX999 returns nothing", engine.findByNumber("XX999") == nullptr, true);
    Engine emptyEngine;
    check("Cheapest of empty list is nothing", emptyEngine.cheapest() == nullptr, true);

    cout << endl << "Flights sorted by price:" << endl;
    for (const Flight& f : engine.sortedByPrice()) {
        cout << "  " << f.flightNumber << "  Rs." << f.price << "  " << f.durationMinutes << " min" << endl;
    }

    cout << endl << passed << " passed, " << failed << " failed" << endl;
    return failed == 0 ? 0 : 1;
}

int main(int argc, char* argv[]) {
    string command = (argc > 1) ? argv[1] : "test";

    if (command == "test") return runTests();
    if (command == "conflict") return runConflict();
    if (command == "pairs") return runPairs();
    if (command == "cheapest" || command == "fastest") return runFlights(command);

    cerr << "Unknown command: " << command << endl;
    return 1;
}
