import { Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Teams from "./pages/Teams.jsx";
import TeamDetails from "./pages/TeamDetails.jsx";
import Matches from "./pages/Matches.jsx";
import Travel from "./pages/Travel.jsx";

// One URL = one page component.
export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/teams" element={<Teams />} />
          <Route path="/teams/:id" element={<TeamDetails />} />
          <Route path="/matches" element={<Matches />} />
          <Route path="/travel" element={<Travel />} />
        </Routes>
      </main>
    </>
  );
}
