import { useEffect, useState } from "react";
import { NavLink, Route, HashRouter as Router, Routes } from "react-router-dom";
import { api, type Status } from "./api/client";
import { Alerts } from "./pages/Alerts";
import { Chat } from "./pages/Chat";
import { Dashboard } from "./pages/Dashboard";
import { News } from "./pages/News";
import { Portfolio } from "./pages/Portfolio";
import { UpdateBanner } from "./components/UpdateBanner";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/chat", label: "Chat" },
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
            width: 220,
            flexShrink: 0,
            padding: "24px 16px",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div
            style={{
              fontSize: 20,
              fontWeight: 800,
              padding: "0 10px",
              marginBottom: 24,
              letterSpacing: -0.5,
              background: "var(--brand-gradient)",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            MACRONI
          </div>
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              style={({ isActive }) => ({
                padding: "10px 14px",
                borderRadius: "var(--radius-md)",
                fontSize: 13.5,
                textDecoration: "none",
                color: isActive ? "#ffffff" : "var(--text-secondary)",
                background: isActive ? "var(--brand-gradient)" : "transparent",
                boxShadow: isActive ? "0 4px 14px rgba(236, 72, 153, 0.28)" : "none",
                fontWeight: isActive ? 700 : 500,
                transition: "background 0.15s ease, color 0.15s ease",
              })}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main style={{ flex: 1, overflow: "auto", padding: "24px 28px 28px" }}>
          {status && (
            <div style={{ marginBottom: 16 }}>
              <UpdateBanner currentVersion={status.app_version} githubRepo={status.github_repo} />
            </div>
          )}
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/news" element={<News />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
