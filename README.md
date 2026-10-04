# TeamSphere – Team & Match Scheduling System

A small full-stack app where a team manager creates teams and players, schedules matches
(with **automatic conflict detection**), and stores travel options for each match.

**The core logic is written in C++.** Conflict detection and cheapest/fastest flight are done by a compiled C++ program that the Node backend runs. Node handles the API, validation and database.

**Stack:** React (Vite) · Node.js + Express · MongoDB + Mongoose · C++ (algorithm module) · Postman

---

## 1. Folder structure

```
teamsphere/
├── backend/
│   ├── server.js              starts Express, connects MongoDB, registers routes
│   ├── models/                Team.js, Player.js, Match.js, Flight.js  (database shapes)
│   ├── routes/                URL -> controller function
│   ├── controllers/           validation + database calls, and they ask the C++ engine to decide
│   ├── utils/cppEngine.js     starts the C++ program, sends data in, reads the answer
│   └── middleware/errorHandler.js   turns every error into { success:false, message }
├── frontend/src/
│   ├── pages/                 Dashboard, Teams, TeamDetails, Matches, Travel
│   ├── components/            Navbar, Message (green/red box)
│   ├── services/api.js        the ONLY place that calls fetch()
│   └── services/format.js     date / time / duration formatting
├── cpp-engine/                THE CORE LOGIC: TravelAndScheduleEngine.cpp (classes + algorithms), main.cpp (entry point + tests)
└── postman/                   TeamSphere.postman_collection.json
```

Request flow (memorise this): **React page → api.js → route → controller → model → MongoDB → C++ engine decides → JSON back → page shows it.**

---

## 2. Run it on your computer

You need: Node.js 18+, **g++** (the backend needs the compiled C++ engine), and MongoDB (local) **or** a free MongoDB Atlas URL.

```bash
# Terminal 1 – backend
cd backend
npm install
npm run build:cpp      # compiles cpp-engine/main.cpp into cpp-engine/engine (do this once, and after any C++ change)
# .env is already created for local MongoDB. Edit MONGO_URI if you use Atlas.
npm run dev            # http://localhost:5000

# Terminal 2 – frontend
cd frontend
npm install
npm run dev            # http://localhost:5173
```

Open http://localhost:5173. Create two teams first, then schedule a match.

Run the C++ tests on their own:
```bash
cd cpp-engine
./engine test          # Windows: engine.exe test   -> 17 PASS lines
```

If the backend says "C++ engine not found", you forgot `npm run build:cpp`. On Windows install g++ with MSYS2/MinGW (or use WSL).

---

## 3. Database (4 collections)

| Collection | Fields | Relationship |
|---|---|---|
| teams | teamName, city, sport, coach | – |
| players | name, age, position, teamId | teamId → teams._id |
| matches | teamA, teamB, date, startTime, endTime, venue, city, status | teamA / teamB → teams._id |
| flights | flightNumber, from, to, price, durationMinutes, availableSeats, matchId | matchId → matches._id |

Dates are stored as `"2026-10-18"` and times as `"18:00"` (plain strings). This avoids time-zone bugs and
`"YYYY-MM-DD"` strings sort correctly.

Delete rules (simple and easy to explain):
- Deleting a **team** deletes its players, but is **blocked** if the team still has matches.
- Deleting a **match** also deletes its flights.

---

## 4. API

All responses: `{ "success": true, "data": ... }` or `{ "success": false, "message": "..." }`

| Method | URL | What it does | Success code |
|---|---|---|---|
| GET | /api/teams | list teams | 200 |
| GET | /api/teams/:id | one team | 200 |
| POST | /api/teams | create team | 201 |
| PUT | /api/teams/:id | edit team | 200 |
| DELETE | /api/teams/:id | delete team | 200 |
| GET | /api/players?teamId= | list players (optionally of one team) | 200 |
| POST / PUT / DELETE | /api/players, /api/players/:id | add / edit / delete player | 201 / 200 / 200 |
| GET | /api/matches?upcoming=true | list matches (upcoming only if flag set) | 200 |
| POST | /api/matches | schedule match (**conflict check**) | 201 |
| PUT | /api/matches/:id | reschedule or cancel (**conflict check again**) | 200 |
| DELETE | /api/matches/:id | delete match | 200 |
| GET | /api/matches/conflicts | count of overlapping scheduled matches (dashboard) | 200 |
| GET | /api/flights?matchId= | flights of a match | 200 |
| POST / DELETE | /api/flights, /api/flights/:id | add / delete flight | 201 / 200 |
| GET | /api/flights/cheapest?matchId= | cheapest flight | 200 |
| GET | /api/flights/fastest?matchId= | fastest flight | 200 |

Error codes: **400** invalid input or conflict · **404** not found · **500** unexpected server error (message is generic, raw MongoDB errors are never sent).

---

## 5. The conflict-detection algorithm (the main feature)

Two time ranges overlap when **each starts before the other ends**:

```js
newStart < existingEnd && newEnd > existingStart
```

Why it covers every case (existing match = 18:00–20:00):

| Case | New match | newStart < 20:00 | newEnd > 18:00 | Result |
|---|---|---|---|---|
| Exact same time | 18:00–20:00 | yes | yes | **conflict** |
| Partial overlap | 19:00–21:00 | yes | yes | **conflict** |
| Starts during existing | 19:00–22:00 | yes | yes | **conflict** |
| Ends during existing | 17:00–19:00 | yes | yes | **conflict** |
| Existing inside new | 17:00–21:00 | yes | yes | **conflict** |
| Back-to-back | 20:00–22:00 | 20:00 < 20:00 **no** | yes | allowed |
| Completely separate | 10:00–12:00 | yes | 12:00 > 18:00 no | allowed |

The rule lives in C++: `TravelAndScheduleEngine::hasConflict()` in `cpp-engine/TravelAndScheduleEngine.cpp`.

Steps in `checkConflict()` (`backend/controllers/matchController.js`):
1. **Node + MongoDB:** fetch only **Scheduled** matches on the **same date** where **either** team plays (`$or` + `$in`).
2. **Node → C++:** `utils/cppEngine.js` sends the new time range and those matches to `./engine conflict`.
3. **C++:** converts `"18:00"` to `1080` minutes and loops over the matches applying the overlap rule (`findConflicts`, O(n)). It prints the ids that overlap, or `NONE`.
4. **Node:** if an id came back → 400 error: `Scheduling conflict: <team> already has a match during this time.`

Details worth mentioning: cancelled matches never block a team; when editing, the match is excluded from its own check (`_id: { $ne: id }`);
complexity is O(1) per comparison and O(k) per request, where k = matches that day for these two teams. The dashboard's conflict count uses `findAllConflicts` in C++, which checks every pair (O(n²)).

Known limit (say it before they ask): matches cannot run past midnight, because end time must be after start time on the same date.

---

## 6. C++ engine (the core logic)

`cpp-engine/TravelAndScheduleEngine.cpp` has three classes: `Flight`, `MatchSlot` (a match's date, teams and time range) and `TravelAndScheduleEngine` (the algorithms).

| Method | Idea | Time / Space |
|---|---|---|
| `hasConflict(...)` | interval overlap | O(1) / O(1) |
| `findConflicts(...)` | one new match vs a list (loop + `hasConflict`) | O(n) / O(k) |
| `findAllConflicts(...)` | every pair of matches (dashboard) | O(n²) / O(k) |
| `cheapest()` | linear scan | O(n) / O(1) |
| `fastest()` | linear scan | O(n) / O(1) |
| `findByNumber()` | `unordered_map` lookup | O(1) avg |
| `sortedByPrice()` | `sort()` + lambda | O(n log n) / O(n) |

`main.cpp` is the program's entry point. It reads the command from `argv` and the data from standard input:

| Command | Input (stdin) | Output (stdout) |
|---|---|---|
| `./engine conflict` | `newStart newEnd`, `n`, then `n` lines `id start end` | ids that overlap, or `NONE` |
| `./engine pairs` | `n`, then `n` lines `id date teamA teamB start end` | one `idA idB` line per clash, or `NONE` |
| `./engine cheapest` / `fastest` | `n`, then `n` lines `id flightNumber price duration` | id of the winner, or `NONE` |
| `./engine test` | – | 17 PASS/FAIL lines |

Try it by hand:
```bash
printf "19:00 21:00\n1\nm1 18:00 20:00\n" | ./engine conflict     # prints: m1
printf "20:00 22:00\n1\nm1 18:00 20:00\n" | ./engine conflict     # prints: NONE  (back-to-back)
```

How Node talks to it: `backend/utils/cppEngine.js` uses `child_process.spawn` to start the program, writes the text to its stdin, and reads stdout. Each request starts a fresh process, which is simple and fast enough for this app.

---

## 7. Postman testing

1. Start backend. 2. Postman → Import → `postman/TeamSphere.postman_collection.json`.
3. Collection → **Run** (Collection Runner) → run all 34 requests in order. Each request has automatic tests and saves IDs (`teamAId`, `matchId`...) for the next ones.
4. If you deploy, change the `baseUrl` collection variable to `https://your-backend.onrender.com/api`.

| Request | Expected |
|---|---|
| Create team A / B | 201, `success:true` |
| Get / update team | 200 |
| Empty team name | 400 `Team name is required` |
| Create player | 201 |
| Negative age | 400 `Age must be greater than 0` |
| Valid match 18:00–20:00 | 201 `Match scheduled successfully.` |
| Partial overlap, exact same time, existing-inside-new, teams swapped | 400 `Scheduling conflict: Hyderabad Hawks already has a match during this time.` |
| Back-to-back 20:00–22:00 | 201 |
| Same team vs same team | 400 `Team A and Team B cannot be the same team` |
| End before start | 400 `End time must be after start time` |
| Reschedule / cancel match | 200 |
| Create / get flights | 201 / 200 |
| Cheapest / fastest | 200 (3800 / 130 min in the sample data) |
| Negative flight price | 400 `Price must be 0 or more` |
| Delete flight, matches, player, teams | 200 |
| Get deleted team | 404 `Team not found` |

---

## 8. Deploy (free tiers, about 30 minutes)

**Step 1 – Database (MongoDB Atlas)**
1. Create a free M0 cluster. Database Access → add a user + password.
2. Network Access → allow `0.0.0.0/0` (fine for a demo).
3. Connect → Drivers → copy the connection string, add `/teamsphere` before the `?`.

**Step 2 – Push to GitHub** (`backend/.env` and `node_modules` are already git-ignored).

**Step 3 – Backend on Render**
1. New → Web Service → pick the repo. Root directory: `backend`.
2. Build command: `npm install && npm run build:cpp` · Start command: `npm start`.
3. Environment variables: `MONGO_URI` = your Atlas string. (Add `CLIENT_URL` later.)
4. **Change the build command** to `npm install && npm run build:cpp` so the C++ engine is compiled on the server.
5. Deploy. Test `https://<name>.onrender.com/` → should say "TeamSphere API is running". The free plan sleeps when idle, so the first request can take ~30 s.

**Step 4 – Frontend on Vercel (or Netlify)**
1. New Project → same repo. Root directory: `frontend`. Framework: Vite.
2. Environment variable: `VITE_API_URL` = `https://<name>.onrender.com/api`
3. Deploy. (`vercel.json` and `public/_redirects` already make page refreshes work with React Router.)

**Step 5 (optional)** On Render set `CLIENT_URL` to your Vercel URL to allow only that site.

**If the Render build says `g++: not found`:** use the included `Dockerfile` instead. On Render choose Runtime: Docker, root directory = the project root (the folder containing `Dockerfile`), and set the same `MONGO_URI` variable. (I could not test the Docker build here, so treat it as the backup plan.)

Common problems: CORS error → check `VITE_API_URL`; "Could not connect to MongoDB" → wrong password or Atlas IP not allowed; blank page after refresh → missing rewrite file; "C++ engine not found" → the build command did not run `npm run build:cpp`.

---

## 9. 15-hour plan

| Hours | Do this |
|---|---|
| 0–1.5 | Run everything. Click through each page. Read this README. |
| 1.5–3.5 | Backend: `server.js`, one model, `teamController.js`, `errorHandler.js`. Understand request → response. |
| 3.5–6 | **`matchController.js`** line by line. Redraw the overlap table from memory on paper. |
| 6–7.5 | Players + flights controllers (same pattern as teams, so skim fast). |
| 7.5–10 | Frontend: `api.js`, `Teams.jsx` (full), then skim the other pages — they repeat the same pattern. |
| 10–11.5 | **C++ (spend extra time here):** read `TravelAndScheduleEngine.cpp` and `main.cpp`, run `./engine test`, try the stdin examples by hand, explain each method's complexity. |
| 11.5–13 | Postman: run the collection, read what each test checks. Break something on purpose and watch it fail. |
| 13–15 | Deploy, then practise the 2-minute pitch and the questions below out loud. |

**2-minute pitch:** "TeamSphere lets a manager manage teams and players and schedule matches. The core rule is that a team can't play two overlapping matches. When a match is created or rescheduled, the backend loads that day's scheduled matches for both teams, converts times to minutes, and checks `newStart < existingEnd && newEnd > existingStart`. If it overlaps, the API returns a 400 with a clear message, and the React page shows it. The decision logic is written in C++: a compiled program that the Node backend runs with the match data and reads the answer back. Node handles the REST API, validation and MongoDB. The stack is React, Express, MongoDB with Mongoose, and I tested the API with Postman."

## 10. Likely interview questions

- **Why C++ inside a Node project?** The scheduling and flight logic is pure computation, so it is separated into a C++ module that is fast, testable on its own (`./engine test`) and shows OOP/STL. Node does what it is good at: HTTP, JSON and the database.
- **How do Node and C++ communicate?** Node spawns the compiled program, writes plain text to stdin, and reads stdout. It is the simplest option; the alternatives are a native addon or a C++ web server, both much harder.
- **Downside of spawning a process per request?** A little start-up cost per call. For heavy traffic I would use a long-running service or a native addon.
- **Why `<` and `>` and not `<=`?** So back-to-back matches (20:00 end, 20:00 start) are allowed.
- **Why store times as strings?** Simple, no time-zone bugs, and `HH:MM` / `YYYY-MM-DD` compare correctly. Trade-off: no overnight matches.
- **What if two people book at the same moment?** Honest answer: a race condition is possible. A fix would be a transaction or a unique slot lock; I kept it simple.
- **Why `asyncHandler`?** It forwards any error from an async function to the error middleware, so controllers need no try/catch.
- **Why populate?** Matches store team IDs; `populate` swaps the IDs for team documents so the UI can show names.
- **How is invalid input handled?** Controller validation throws a 400 error; Mongoose schema rules are a second safety net; the error middleware formats the response.
- **How would you scale it?** Add an index on `{ date, teamA, teamB }`, add login, and paginate lists.
