// TravelAndScheduleEngine.cpp
// The CORE LOGIC of TeamSphere. The Node backend runs this program for:
//   1. Match conflict detection   (interval overlap)
//   2. Cheapest flight            (linear scan)
//   3. Fastest flight             (linear scan)
// main.cpp reads input from the backend, calls these methods, prints the answer.

#include <algorithm>
#include <iostream>
#include <string>
#include <unordered_map>
#include <utility>
#include <vector>
using namespace std;

// ---------------------------------------------------------------
// A Flight is a small object that holds data.
// ---------------------------------------------------------------
class Flight {
public:
    string flightNumber;
    string from;
    string to;
    int price;
    int durationMinutes;
    int availableSeats;
    string id; // database _id, so the backend can find the winning flight

    Flight(string flightNumber, string from, string to, int price, int durationMinutes,
           int availableSeats, string id = "")
        : flightNumber(flightNumber), from(from), to(to), price(price),
          durationMinutes(durationMinutes), availableSeats(availableSeats), id(id) {}
};

// ---------------------------------------------------------------
// A MatchSlot is the part of a match we need for scheduling:
// which day, which teams, and the time range in minutes after midnight.
// ---------------------------------------------------------------
class MatchSlot {
public:
    string id;
    string date;  // "2026-10-18"
    string teamA;
    string teamB;
    int start;    // minutes after midnight, 18:00 -> 1080
    int end;

    MatchSlot(string id, int start, int end, string date = "", string teamA = "", string teamB = "")
        : id(id), date(date), teamA(teamA), teamB(teamB), start(start), end(end) {}
};

// ---------------------------------------------------------------
// The engine owns the flights and offers all algorithms as methods.
// ---------------------------------------------------------------
class TravelAndScheduleEngine {
private:
    vector<Flight> flights;                   // all flights, in the order they were added
    unordered_map<string, int> indexByNumber; // flightNumber -> position in the vector

public:
    // "18:00" -> 1080 (minutes after midnight).
    // Time: O(1), Space: O(1)
    static int toMinutes(const string& time) {
        int hours = stoi(time.substr(0, 2));
        int minutes = stoi(time.substr(3, 2));
        return hours * 60 + minutes;
    }

    // FUNCTION 1 - Match conflict.
    // Two time ranges overlap when EACH one starts before the OTHER ends.
    // true = conflict, false = no conflict.
    // Back-to-back (end == start) is NOT a conflict because of the strict < and >.
    // Time: O(1), Space: O(1)
    static bool hasConflict(int newStart, int newEnd, int existingStart, int existingEnd) {
        return newStart < existingEnd && newEnd > existingStart;
    }

    // Check ONE new time range against a list of existing matches.
    // Returns the ids of every existing match that overlaps.
    // Time: O(n), Space: O(k) where k = number of conflicts
    static vector<string> findConflicts(int newStart, int newEnd, const vector<MatchSlot>& existing) {
        vector<string> conflictIds;
        for (const MatchSlot& m : existing) {
            if (hasConflict(newStart, newEnd, m.start, m.end)) {
                conflictIds.push_back(m.id);
            }
        }
        return conflictIds;
    }

    // Used by the dashboard: find every pair of matches that clash.
    // Two matches clash if: same date + they share a team + their times overlap.
    // Time: O(n^2), Space: O(k) - fine for a small app.
    static vector<pair<string, string>> findAllConflicts(const vector<MatchSlot>& matches) {
        vector<pair<string, string>> pairsFound;
        for (size_t i = 0; i < matches.size(); i++) {
            for (size_t j = i + 1; j < matches.size(); j++) {
                const MatchSlot& a = matches[i];
                const MatchSlot& b = matches[j];
                bool sameDate = a.date == b.date;
                bool shareTeam = a.teamA == b.teamA || a.teamA == b.teamB ||
                                 a.teamB == b.teamA || a.teamB == b.teamB;
                if (sameDate && shareTeam && hasConflict(a.start, a.end, b.start, b.end)) {
                    pairsFound.push_back(make_pair(a.id, b.id));
                }
            }
        }
        return pairsFound;
    }

    // Add a flight to the list and remember where it is.
    // Time: O(1) on average
    void addFlight(const Flight& flight) {
        indexByNumber[flight.flightNumber] = flights.size();
        flights.push_back(flight);
    }

    // Look up a flight by its number using the hash map.
    // Time: O(1) on average. Returns nullptr when not found.
    const Flight* findByNumber(const string& flightNumber) const {
        auto it = indexByNumber.find(flightNumber);
        if (it == indexByNumber.end()) return nullptr;
        return &flights[it->second];
    }

    // FUNCTION 2 - Cheapest flight (linear scan).
    // Time: O(n), Space: O(1)
    const Flight* cheapest() const {
        if (flights.empty()) return nullptr;
        const Flight* best = &flights[0];
        for (size_t i = 1; i < flights.size(); i++) {
            if (flights[i].price < best->price) best = &flights[i];
        }
        return best;
    }

    // FUNCTION 3 - Fastest flight (linear scan).
    // Time: O(n), Space: O(1)
    const Flight* fastest() const {
        if (flights.empty()) return nullptr;
        const Flight* best = &flights[0];
        for (size_t i = 1; i < flights.size(); i++) {
            if (flights[i].durationMinutes < best->durationMinutes) best = &flights[i];
        }
        return best;
    }

    // Bonus: all flights sorted from cheapest to most expensive.
    // sort() with a lambda comparator.
    // Time: O(n log n), Space: O(n) because we sort a copy.
    vector<Flight> sortedByPrice() const {
        vector<Flight> copy = flights;
        sort(copy.begin(), copy.end(), [](const Flight& a, const Flight& b) {
            return a.price < b.price;
        });
        return copy;
    }
};
