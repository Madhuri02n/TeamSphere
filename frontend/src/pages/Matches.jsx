import { useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatTime } from "../services/format";
import Message from "../components/Message";

const emptyForm = { teamA: "", teamB: "", date: "", startTime: "", endTime: "", venue: "", city: "" };

export default function Matches() {
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [showAll, setShowAll] = useState(false); // false = only upcoming matches
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function loadMatches() {
    try {
      const url = showAll ? "/matches" : "/matches?upcoming=true";
      const res = await api.get(url);
      setMatches(res.data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    api.get("/teams").then((res) => setTeams(res.data)).catch((err) => setMessage({ type: "error", text: err.message }));
  }, []);

  useEffect(() => {
    loadMatches();
  }, [showAll]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  // Reschedule = edit the match. The backend re-checks conflicts.
  function openEditForm(match) {
    setForm({
      teamA: match.teamA._id,
      teamB: match.teamB._id,
      date: match.date,
      startTime: match.startTime,
      endTime: match.endTime,
      venue: match.venue,
      city: match.city,
    });
    setEditingId(match._id);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      let res;
      if (editingId) {
        res = await api.put(`/matches/${editingId}`, form);
      } else {
        res = await api.post("/matches", form);
      }
      setMessage({ type: "success", text: res.message }); // "Match scheduled successfully."
      setShowForm(false);
      loadMatches();
    } catch (err) {
      // A scheduling conflict arrives here as a clear error message.
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleCancel(match) {
    try {
      await api.put(`/matches/${match._id}`, { status: "Cancelled" });
      setMessage({ type: "success", text: "Match cancelled." });
      loadMatches();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this match and its travel options?")) return;
    try {
      await api.remove(`/matches/${id}`);
      setMessage({ type: "success", text: "Match deleted." });
      loadMatches();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>{showAll ? "All Matches" : "Upcoming Matches"}</h1>
        <button onClick={openAddForm}>Schedule Match</button>
      </div>

      <Message type={message.type} text={message.text} />

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <h3>{editingId ? "Reschedule match" : "Schedule match"}</h3>

          <select name="teamA" value={form.teamA} onChange={handleChange}>
            <option value="">Select Team A</option>
            {teams.map((t) => <option key={t._id} value={t._id}>{t.teamName}</option>)}
          </select>

          <select name="teamB" value={form.teamB} onChange={handleChange}>
            <option value="">Select Team B</option>
            {teams.map((t) => <option key={t._id} value={t._id}>{t.teamName}</option>)}
          </select>

          <input name="date" type="date" value={form.date} onChange={handleChange} />
          <input name="startTime" type="time" value={form.startTime} onChange={handleChange} />
          <input name="endTime" type="time" value={form.endTime} onChange={handleChange} />
          <input name="venue" placeholder="Venue" value={form.venue} onChange={handleChange} />
          <input name="city" placeholder="City" value={form.city} onChange={handleChange} />

          <div className="actions">
            <button type="submit">{editingId ? "Save changes" : "Schedule match"}</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Close</button>
          </div>
        </form>
      )}

      <label className="checkbox">
        <input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} />
        Show all matches (including cancelled and past)
      </label>

      {matches.length === 0 ? (
        <p className="muted">No matches to show. Click "Schedule Match" to add one.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Team A</th><th>Team B</th><th>Date</th><th>Time</th><th>Venue</th><th>Status</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {matches.map((m) => (
              <tr key={m._id}>
                <td>{m.teamA.teamName}</td>
                <td>{m.teamB.teamName}</td>
                <td>{formatDate(m.date)}</td>
                <td>{formatTime(m.startTime)} - {formatTime(m.endTime)}</td>
                <td>{m.venue}</td>
                <td><span className={`badge ${m.status}`}>{m.status}</span></td>
                <td className="actions">
                  <button className="secondary" onClick={() => openEditForm(m)}>Edit</button>
                  {m.status === "Scheduled" && <button className="secondary" onClick={() => handleCancel(m)}>Cancel</button>}
                  <button className="danger" onClick={() => handleDelete(m._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
