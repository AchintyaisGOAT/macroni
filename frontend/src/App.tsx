import {
  Bell,
  CircleUserRound,
  Eye,
  Globe,
  Headphones,
  LayoutDashboard,
  Landmark,
  MessageCircle,
  Newspaper,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Route, HashRouter as Router, Routes, useLocation } from "react-router-dom";
import { api } from "./api/client";
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

function AppVersion() {
  const [version, setVersion] = useState<string | null>(null);

  useEffect(() => {
    api
      .status()
      .then((data) => setVersion(data.app_version))
      .catch(() => {
        // Backend not reachable yet - just don't show a version.
      });
  }, []);

  if (!version) return null;

  return (
    <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", letterSpacing: 0.2, flexShrink: 0 }}>
      v{version}
    </span>
  );
}

// The Chat page already IS the chat, so the floating launcher would be redundant there.
function FloatingChatButtonUnlessOnChatPage() {
  const location = useLocation();
  if (location.pathname === "/chat") return null;
  return <FloatingChatButton />;
}

// Primary destinations get a labeled nav item; everything else (Alerts,
// Account) is a secondary/utility action that only needs an icon - splitting
// the two is what keeps a 10-route app from crowding a single row.
const PRIMARY_ITEMS: { to: string; label: string; icon: LucideIcon; end?: boolean }[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/portfolio", label: "Portfolio", icon: Wallet },
  { to: "/watchlist", label: "Watchlist", icon: Eye },
  { to: "/broker", label: "Broker", icon: Landmark },
  { to: "/markets", label: "Global Markets", icon: Globe },
  { to: "/news", label: "News", icon: Newspaper },
  { to: "/chat", label: "Chat", icon: MessageCircle },
  { to: "/support", label: "Support", icon: Headphones },
];

const UTILITY_ITEMS: { to: string; label: string; icon: LucideIcon }[] = [
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/account", label: "Account", icon: CircleUserRound },
];

function navLinkStyle(isActive: boolean): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 7,
    padding: "7px 10px",
    borderRadius: "var(--radius-md)",
    fontSize: 13,
    textDecoration: "none",
    color: isActive ? "var(--on-brand)" : "var(--text-secondary)",
    background: isActive ? "var(--brand-gradient)" : "transparent",
    boxShadow: isActive ? "var(--shadow-brand)" : "none",
    fontWeight: isActive ? 700 : 500,
    transition: "background 0.15s ease, color 0.15s ease",
    whiteSpace: "nowrap",
  };
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
          <header
            style={{
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "10px 20px",
              // Same glass treatment as before, now along the top edge: a
              // translucent surface tint + backdrop blur so the page's
              // topography pattern shows through instead of a flat bar.
              background: "color-mix(in srgb, var(--surface-1) 38%, transparent)",
              backdropFilter: "blur(22px) saturate(180%)",
              WebkitBackdropFilter: "blur(22px) saturate(180%)",
              borderBottom: "1px solid var(--border)",
              boxShadow: "0 4px 24px rgba(23, 18, 35, 0.06)",
              overflowX: "auto",
            }}
          >
            <div
              style={{
                fontSize: 24,
                fontWeight: 900,
                letterSpacing: -0.8,
                marginRight: 16,
                flexShrink: 0,
                background: "var(--brand-gradient)",
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                filter: "drop-shadow(0 2px 10px rgba(252, 70, 107, 0.25))",
              }}
            >
              MACRONI
            </div>

            <nav style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {PRIMARY_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink key={item.to} to={item.to} end={item.end} style={({ isActive }) => navLinkStyle(isActive)}>
                    <Icon size={16} strokeWidth={2.25} style={{ flexShrink: 0 }} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {UTILITY_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    title={item.label}
                    aria-label={item.label}
                    style={({ isActive }) => ({
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 34,
                      height: 34,
                      borderRadius: "var(--radius-md)",
                      textDecoration: "none",
                      color: isActive ? "var(--on-brand)" : "var(--text-secondary)",
                      background: isActive ? "var(--brand-gradient)" : "transparent",
                      boxShadow: isActive ? "var(--shadow-brand)" : "none",
                    })}
                  >
                    <Icon size={16} strokeWidth={2.25} />
                  </NavLink>
                );
              })}
              <div style={{ width: 1, height: 20, background: "var(--border)", margin: "0 8px", flexShrink: 0 }} />
              <AppVersion />
            </div>
          </header>

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
