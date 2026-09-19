import { useEffect, useState } from "react";
import { NavLink, Route, HashRouter as Router, Routes } from "react-router-dom";
import { api, type Status } from "./api/client";
import { Alerts } from "./pages/Alerts";
import { Dashboard } from "./pages/Dashboard";
import { News } from "./pages/News";
import { Portfolio } from "./pages/Portfolio";
import { UpdateBanner } from "./components/UpdateBanner";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/alerts", label: "Alerts" },
  { to: "/news", label: "News" },
];

function App() {
  const [status, setStatus] = useState<Status | null>(null);

  useEffect(() => {
    api.status().then(setStatus).catch(() => {});
  }, []);

  return (
    <Router>
      <div style={{ display: "flex", height: "100vh" }}>
        <nav
          style={{
            width: 200,
            flexShrink: 0,
            background: "var(--surface-1)",
            borderRight: "1px solid var(--border)",
            padding: "20px 12px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 600, padding: "0 8px", marginBottom: 16 }}>
            MACRONI
          </div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: "8px 10px",
                borderRadius: 6,
                fontSize: 13,
                textDecoration: "none",
                color: isActive ? "var(--text-primary)" : "var(--text-secondary)",
                background: isActive ? "var(--page-plane)" : "transparent",
                fontWeight: isActive ? 600 : 400,
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, overflow: "auto", padding: 24 }}>
          {status && (
            <div style={{ marginBottom: 16 }}>
              <UpdateBanner currentVersion={status.app_version} githubRepo={status.github_repo} />
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/news" element={<News />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
