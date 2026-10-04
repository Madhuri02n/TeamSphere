import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import Message from "../components/Message";

const emptyForm = { teamName: "", city: "", sport: "", coach: "" };

export default function Teams() {
  const [teams, setTeams] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // null = adding, otherwise editing this team
  const [showForm, setShowForm] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  async function loadTeams() {
    try {
      const res = await api.get("/teams");
      setTeams(res.data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  useEffect(() => {
    loadTeams();
  }, []);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  function openAddForm() {
    setForm(emptyForm);
    setEditingId(null);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  function openEditForm(team) {
    setForm({ teamName: team.teamName, city: team.city, sport: team.sport, coach: team.coach });
    setEditingId(team._id);
    setShowForm(true);
    setMessage({ type: "", text: "" });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/teams/${editingId}`, form);
        setMessage({ type: "success", text: "Team updated successfully." });
      } else {
        await api.post("/teams", form);
        setMessage({ type: "success", text: "Team created successfully." });
      }
      setShowForm(false);
      loadTeams();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(id) {
    if (!window.confirm("Delete this team and its players?")) return;
    try {
      await api.remove(`/teams/${id}`);
      setMessage({ type: "success", text: "Team deleted." });
      loadTeams();
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div>
      <div className="page-header">
        <h1>Teams</h1>
        <button onClick={openAddForm}>Add Team</button>
      </div>

      <Message type={message.type} text={message.text} />

      {showForm && (
        <form className="card form" onSubmit={handleSubmit}>
          <h3>{editingId ? "Edit team" : "Add team"}</h3>
          <input name="teamName" placeholder="Team name" value={form.teamName} onChange={handleChange} />
          <input name="city" placeholder="City" value={form.city} onChange={handleChange} />
          <input name="sport" placeholder="Sport" value={form.sport} onChange={handleChange} />
          <input name="coach" placeholder="Coach" value={form.coach} onChange={handleChange} />
          <div className="actions">
            <button type="submit">{editingId ? "Save changes" : "Create team"}</button>
            <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
          </div>
        </form>
      )}

      {teams.length === 0 ? (
        <p className="muted">No teams yet. Click "Add Team" to create one.</p>
      ) : (
        <table>
          <thead>
            <tr><th>Team</th><th>City</th><th>Sport</th><th>Coach</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {teams.map((team) => (
              <tr key={team._id}>
                <td>{team.teamName}</td>
                <td>{team.city}</td>
                <td>{team.sport}</td>
                <td>{team.coach}</td>
                <td className="actions">
                  <Link className="button" to={`/teams/${team._id}`}>View</Link>
                  <button className="secondary" onClick={() => openEditForm(team)}>Edit</button>
                  <button className="danger" onClick={() => handleDelete(team._id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
