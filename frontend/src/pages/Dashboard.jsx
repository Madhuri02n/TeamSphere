import { useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatTime } from "../services/format";
import Message from "../components/Message";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [upcoming, setUpcoming] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    async function load() {
      try {
        // Ask for everything at the same time
        const [teams, players, matches, flights, conflicts] = await Promise.all([
          api.get("/teams"),
          api.get("/players"),
          api.get("/matches?upcoming=true"),
          api.get("/flights"),
          api.get("/matches/conflicts"),
        ]);
        setStats({
          teams: teams.data.length,
          players: players.data.length,
          matches: matches.data.length,
          flights: flights.data.length,
          conflicts: conflicts.data.count,
        });
        setUpcoming(matches.data.slice(0, 5));
      } catch (err) {
        setError(err.message);
      }
    }
    load();
  }, []);

  return (
    <div>
      <h1>TeamSphere</h1>
      <Message type="error" text={error} />

      {stats && (
        <div className="stats">
          <div className="card"><span className="number">{stats.teams}</span>Teams</div>
          <div className="card"><span className="number">{stats.players}</span>Players</div>
          <div className="card"><span className="number">{stats.matches}</span>Upcoming matches</div>
          <div className="card"><span className="number">{stats.flights}</span>Travel options</div>
          <div className="card"><span className="number">{stats.conflicts}</span>Scheduling conflicts</div>
        </div>
      )}

      <h2>Upcoming</h2>
      {upcoming.length === 0 && <p className="muted">No upcoming matches. Schedule one on the Matches page.</p>}
      {upcoming.map((m) => (
        <div className="card match-row" key={m._id}>
          <strong>{m.teamA.teamName} vs {m.teamB.teamName}</strong>
          <span>{formatDate(m.date)}, {formatTime(m.startTime)} - {formatTime(m.endTime)}</span>
          <span className="muted">{m.venue}</span>
        </div>
      ))}
    </div>
  );
}
