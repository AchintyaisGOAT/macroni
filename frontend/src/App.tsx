import { NavLink, Route, HashRouter as Router, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import { Account } from "./pages/Account";
import { Alerts } from "./pages/Alerts";
import { Broker } from "./pages/Broker";
import { Chat } from "./pages/Chat";
import { Dashboard } from "./pages/Dashboard";
import { GlobalMarkets } from "./pages/GlobalMarkets";
import { MarketStocks } from "./pages/MarketStocks";
import { News } from "./pages/News";
import { Portfolio } from "./pages/Portfolio";
import { Support } from "./pages/Support";
import { Watchlist } from "./pages/Watchlist";
import { FloatingChatButton } from "./components/FloatingChatButton";
import { UpdateBanner } from "./components/UpdateBanner";

// The Chat page already IS the chat, so the floating launcher would be redundant there.
function FloatingChatButtonUnlessOnChatPage() {
  const location = useLocation();
  if (location.pathname === "/chat") return null;
  return <FloatingChatButton />;
}

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/portfolio", label: "Portfolio" },
  { to: "/watchlist", label: "Watchlist" },
  { to: "/broker", label: "Broker" },
  { to: "/markets", label: "Global Markets" },
  { to: "/chat", label: "Chat" },
  { to: "/alerts", label: "Alerts" },
  { to: "/news", label: "News" },
  { to: "/support", label: "Support" },
  { to: "/account", label: "Account" },
];

function App() {
  return (
    <AuthProvider>
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
            <div style={{ marginBottom: 16 }}>
              <UpdateBanner />
            </div>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/portfolio" element={<Portfolio />} />
              <Route path="/watchlist" element={<Watchlist />} />
              <Route path="/broker" element={<Broker />} />
              <Route path="/markets" element={<GlobalMarkets />} />
              <Route path="/markets/:code/stocks" element={<MarketStocks />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/news" element={<News />} />
              <Route path="/support" element={<Support />} />
              <Route path="/account" element={<Account />} />
            </Routes>
          </main>
          <FloatingChatButtonUnlessOnChatPage />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
