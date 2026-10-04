// Bridge between Node and the C++ engine.
//
// How it works: Node starts the compiled C++ program (cpp-engine/engine),
// writes the data to its standard input, and reads the answer from its standard output.
// All scheduling / flight decisions are made by the C++ code.

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

const exeName = process.platform === "win32" ? "engine.exe" : "engine";
const ENGINE_PATH = process.env.CPP_ENGINE_PATH || path.join(__dirname, "..", "..", "cpp-engine", exeName);

function engineExists() {
  return fs.existsSync(ENGINE_PATH);
}

// Run: ENGINE_PATH <command>   with `input` text sent to stdin. Resolves with stdout text.
function runEngine(command, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(ENGINE_PATH, [command]);
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (chunk) => (output += chunk));
    child.stderr.on("data", (chunk) => (errorOutput += chunk));
    child.on("error", reject); // e.g. engine file missing
    child.on("close", (code) => {
      if (code !== 0) reject(new Error(`C++ engine failed (${command}): ${errorOutput}`));
      else resolve(output.trim());
    });

    child.stdin.write(input);
    child.stdin.end();
  });
}

// "NONE" -> [], "id1 id2" -> ["id1", "id2"]
function parseIds(text) {
  return text === "NONE" ? [] : text.split(/\s+/);
}

// Which of these existing matches overlap the new time range?
// newStart / newEnd are "HH:MM" strings. Returns an array of match ids.
async function findConflicts(newStart, newEnd, existingMatches) {
  let input = `${newStart} ${newEnd}\n${existingMatches.length}\n`;
  for (const m of existingMatches) {
    input += `${m._id} ${m.startTime} ${m.endTime}\n`;
  }
  return parseIds(await runEngine("conflict", input));
}

// All clashing pairs among these matches (teamA / teamB must be plain ids).
// Returns [[idA, idB], ...]
async function findAllConflicts(matches) {
  let input = `${matches.length}\n`;
  for (const m of matches) {
    input += `${m._id} ${m.date} ${m.teamA} ${m.teamB} ${m.startTime} ${m.endTime}\n`;
  }
  const output = await runEngine("pairs", input);
  if (output === "NONE") return [];
  return output.split("\n").map((line) => line.trim().split(/\s+/));
}

// type is "cheapest" or "fastest". Returns the winning flight's id, or null.
async function pickFlight(type, flights) {
  let input = `${flights.length}\n`;
  for (const f of flights) {
    const safeNumber = String(f.flightNumber).replace(/\s+/g, "_"); // stdin is split on spaces
    input += `${f._id} ${safeNumber} ${f.price} ${f.durationMinutes}\n`;
  }
  const output = await runEngine(type, input);
  return output === "NONE" ? null : output;
}

module.exports = { ENGINE_PATH, engineExists, findConflicts, findAllConflicts, pickFlight };
