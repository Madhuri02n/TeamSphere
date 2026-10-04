import { NavLink } from "react-router-dom";

export default function Navbar() {
  return (
    <header className="navbar">
      <span className="brand">TeamSphere</span>
      <nav>
        <NavLink to="/" end>Dashboard</NavLink>
        <NavLink to="/teams">Teams</NavLink>
        <NavLink to="/matches">Matches</NavLink>
        <NavLink to="/travel">Travel</NavLink>
      </nav>
    </header>
  );
}
