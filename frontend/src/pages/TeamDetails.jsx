import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../services/api";
import Message from "../components/Message";

const emptyForm = { name: "", age: "", position: "" };

export default function TeamDetails() {
  const { id } = useParams(); // the :id from the URL /teams/:id
  const [team, setTeam] = useState(null);
  const [players, setPlayers] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function loadData() {
    try {
      const teamRes = await api.get(`/teams/${id}`);
      const playerRes = await api.get(`/players?teamId=${id}`);
      setTeam(teamRes.data);
      setPlayers(playerRes.data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    loadData();
  }, [id]);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  function openEditForm(player) {
    setForm({ name: player.name, age: player.age, position: player.position });
    setEditingId(player._id);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const body = { ...form, teamId: id };
    try {
      if (editingId) {
        await api.put(`/players/${editingId}`, body);
        setMessage({ type: "success", text: "Player updated successfully." });
      } else {
        await api.post("/players", body);
        setMessage({ type: "success", text: "Player added successfully." });
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(playerId) {
    if (!window.confirm("Delete this player?")) return;
    try {
      await api.remove(`/players/${playerId}`);
      setMessage({ type: "success", text: "Player deleted." });
      loadData();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  if (!team) return <Message type="error" text={message.text || ""} />;

  return (
    <div>
      <Link to="/teams">&larr; Back to teams</Link>
      <h1>{team.teamName}</h1>
      <div className="card">
        <p><strong>Coach:</strong> {team.coach || "-"}</p>
        <p><strong>City:</strong> {team.city}</p>
        <p><strong>Sport:</strong> {team.sport || "-"}</p>
      </div>

      <div className="page-header">
        <h2>Players</h2>
        <button onClick={openAddForm}>Add Player</button>
      </div>

      <Message type={message.type} text={message.text} />

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit player" : "Add player"}</h3>
          <input name="name" placeholder="Name" value={form.name} onChange={handleChange} />
          <input name="age" type="number" placeholder="Age" value={form.age} onChange={handleChange} />
          <input name="position" placeholder="Position (e.g. Batsman)" value={form.position} onChange={handleChange} />
          <div className="actions">
            <button type="submit">{editingId ? "Save changes" : "Add player"}</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {players.length === 0 ? (
        <p className="muted">No players yet.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Name</th><th>Age</th><th>Position</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {players.map((p) => (
              <tr key={p._id}>
                <td>{p.name}</td>
                <td>{p.age}</td>
                <td>{p.position}</td>
                <td className="actions">
                  <button className="secondary" onClick={() => openEditForm(p)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(p._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
