import { useEffect, useState } from "react";
import { api } from "../services/api";
import { formatDate, formatDuration } from "../services/format";
import Message from "../components/Message";

const emptyForm = { flightNumber: "", from: "", to: "", price: "", durationMinutes: "", availableSeats: "" };

export default function Travel() {
  const [matches, setMatches] = useState([]);
  const [matchId, setMatchId] = useState("");
  const [flights, setFlights] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [result, setResult] = useState(null); // { label, flight }
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    api.get("/matches").then((res) => setMatches(res.data)).catch((err) => setMessage({ type: "error", text: err.message }));
  }, []);

  async function loadFlights(id) {
    try {
      const res = await api.get(`/flights?matchId=${id}`);
      setFlights(res.data);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  function handleMatchChange(e) {
    const id = e.target.value;
    setMatchId(id);
    setResult(null);
    setShowForm(false);
    setMessage({ type: "", text: "" });
    if (id) loadFlights(id);
    else setFlights([]);
  }

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      await api.post("/flights", { ...form, matchId });
      setMessage({ type: "success", text: "Flight added successfully." });
      setForm(emptyForm);
      setShowForm(false);
      setResult(null);
      loadFlights(matchId);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function handleDelete(id) {
    try {
      await api.remove(`/flights/${id}`);
      setMessage({ type: "success", text: "Flight deleted." });
      setResult(null);
      loadFlights(matchId);
    } catch (err) {
      setMessage({ type: "error", text: err.message });
    }
  }

  async function findBest(type) {
    try {
      const res = await api.get(`/flights/${type}?matchId=${matchId}`);
      setResult({ label: type === "cheapest" ? "Cheapest" : "Fastest", flight: res.data });
      setMessage({ type: "", text: "" });
    } catch (err) {
      setResult(null);
      setMessage({ type: "error", text: err.message });
    }
  }

  return (
    <div>
      <h1>Travel</h1>

      <select value={matchId} onChange={handleMatchChange}>
        <option value="">Select a match</option>
        {matches.map((m) => (
          <option key={m._id} value={m._id}>
            {m.teamA.teamName} vs {m.teamB.teamName} - {formatDate(m.date)}
          </option>
        ))}
      </select>

      <Message type={message.type} text={message.text} />

      {matchId && (
        <>
          <div className="actions toolbar">
            <button onClick={() => setShowForm(!showForm)}>Add Flight</button>
            <button className="secondary" onClick={() => findBest("cheapest")}>Find Cheapest</button>
            <button className="secondary" onClick={() => findBest("fastest")}>Find Fastest</button>
          </div>

          {result && (
            <div className="card result">
              <strong>{result.label}:</strong>{" "}
              {result.label === "Cheapest" ? `₹${result.flight.price}` : formatDuration(result.flight.durationMinutes)}
              <span className="muted"> ({result.flight.flightNumber}, {result.flight.from} to {result.flight.to})</span>
            </div>
          )}

          {showForm && (
            <form className="card form" onSubmit={handleSubmit}>
              <h3>Add flight</h3>
              <input name="flightNumber" placeholder="Flight number (AI101)" value={form.flightNumber} onChange={handleChange} />
              <input name="from" placeholder="From" value={form.from} onChange={handleChange} />
              <input name="to" placeholder="To" value={form.to} onChange={handleChange} />
              <input name="price" type="number" placeholder="Price (₹)" value={form.price} onChange={handleChange} />
              <input name="durationMinutes" type="number" placeholder="Duration (minutes)" value={form.durationMinutes} onChange={handleChange} />
              <input name="availableSeats" type="number" placeholder="Available seats" value={form.availableSeats} onChange={handleChange} />
              <div className="actions">
                <button type="submit">Save flight</button>
                <button type="button" className="secondary" onClick={() => setShowForm(false)}>Cancel</button>
              </div>
            </form>
          )}

          {flights.length === 0 ? (
            <p className="muted">No flights for this match yet.</p>
          ) : (
            <table>
              <thead>
                <tr><th>Flight</th><th>From</th><th>To</th><th>Price</th><th>Duration</th><th>Seats</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {flights.map((f) => (
                  <tr key={f._id}>
                    <td>{f.flightNumber}</td>
                    <td>{f.from}</td>
                    <td>{f.to}</td>
                    <td>₹{f.price}</td>
                    <td>{formatDuration(f.durationMinutes)}</td>
                    <td>{f.availableSeats}</td>
                    <td className="actions">
                      <button className="danger" onClick={() => handleDelete(f._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </div>
  );
}
