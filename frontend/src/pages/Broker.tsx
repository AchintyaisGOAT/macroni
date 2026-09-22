import { useEffect, useState } from "react";
import { api, type BrokerHolding, type BrokerStatus, type SyncResult } from "../api/client";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { Dot } from "../components/Dot";
import { PageHeader } from "../components/PageHeader";
import { Table } from "../components/Table";
import { extractErrorDetail } from "../lib/errors";
import { emptyTextStyle, errorTextStyle, formCardWidth, inputStyle, labelStyle, loadingTextStyle } from "../styles";

// Angel One is India-only, so every holding it returns trades in rupees.
const RUPEE = "₹";

export function Broker() {
  const [status, setStatus] = useState<BrokerStatus | null>(null);
  const [holdings, setHoldings] = useState<BrokerHolding[] | null>(null);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [clientCode, setClientCode] = useState("");
  const [mpin, setMpin] = useState("");
  const [totpSecret, setTotpSecret] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);

  async function refreshStatus(): Promise<BrokerStatus> {
    const s = await api.brokerStatus();
    setStatus(s);
    return s;
  }

  // Credentials are saved once to the local .env; every later call to this just
  // re-derives a fresh TOTP code from that saved secret and re-logs in - the user
  // never needs to retype anything after the first connect.
  async function loadHoldings(isBackgroundRefresh = false) {
    if (!isBackgroundRefresh) setHoldingsLoading(true);
    if (!isBackgroundRefresh) setError(null);
    try {
      const h = await api.brokerHoldings();
      setHoldings(h);
      await refreshStatus();
    } catch (err) {
      if (!isBackgroundRefresh) setError(extractErrorDetail(err));
    } finally {
      if (!isBackgroundRefresh) setHoldingsLoading(false);
    }
  }

  useEffect(() => {
    let pollInterval: ReturnType<typeof setInterval> | undefined;
    (async () => {
      try {
        const s = await refreshStatus();
        setShowForm(!s.configured);
        if (s.configured) {
          await loadHoldings();
          // The backend caches Angel One's own holdings response for 30s to stay
          // well under its rate limit, so a 60s poll here can't exceed that.
          pollInterval = setInterval(() => loadHoldings(true), 60_000);
        }
      } catch (err) {
        setError(extractErrorDetail(err));
      }
    })();
    return () => {
      if (pollInterval) clearInterval(pollInterval);
    };
  }, []);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setConnecting(true);
    try {
      await api.saveBrokerCredentials({
        api_key: apiKey,
        client_code: clientCode,
        mpin,
        totp_secret: totpSecret,
      });
      setApiKey("");
      setClientCode("");
      setMpin("");
      setTotpSecret("");
      setShowForm(false);
      await loadHoldings();
    } catch (err) {
      setError(extractErrorDetail(err));
    } finally {
      setConnecting(false);
    }
  }

  async function handleSync() {
    setError(null);
    setSyncResult(null);
    setSyncing(true);
    try {
      const result = await api.syncBrokerToPortfolio();
      setSyncResult(result);
    } catch (err) {
      setError(extractErrorDetail(err));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Broker" subtitle="Read-only connection to Angel One" />

      <Card padding="18px 20px">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
          Broker connection · Angel One
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 12 }}>
          Read-only. MACRONI can view your holdings, positions, and funds to give you AI guidance - it can never
          place, modify, or cancel an order. Your credentials stay on this computer and talk directly to Angel
          One's servers; they are never sent to the AI proxy. They're stored in plaintext in this app's local
          config file, the same way a trading terminal remembers your login.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <Dot
            color={
              status?.connected ? "var(--status-good)" : status?.configured ? "var(--status-warning)" : "var(--text-muted)"
            }
          />
          <span style={{ fontSize: 13, fontWeight: 600 }}>
            {status?.connected
              ? `Connected as ${status.client_code}`
              : status?.configured
                ? "Credentials saved, not yet connected"
                : "Not connected"}
          </span>
        </div>
      </Card>

      {showForm ? (
        <Card padding="18px 20px" style={{ alignSelf: "center", width: formCardWidth, maxWidth: "100%" }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            {status?.configured ? "Update credentials" : "Connect your account"}
          </div>
          <form onSubmit={handleConnect} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 220px))", gap: 12 }}>
              <div>
                <label style={labelStyle}>API key</label>
                <input style={{ ...inputStyle, width: "100%" }} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>Client code</label>
                <input style={{ ...inputStyle, width: "100%" }} value={clientCode} onChange={(e) => setClientCode(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>MPIN</label>
                <input style={{ ...inputStyle, width: "100%" }} type="password" value={mpin} onChange={(e) => setMpin(e.target.value)} />
              </div>
              <div>
                <label style={labelStyle}>TOTP secret</label>
                <input style={{ ...inputStyle, width: "100%" }} type="password" value={totpSecret} onChange={(e) => setTotpSecret(e.target.value)} />
              </div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <Button type="submit" disabled={connecting || !apiKey || !clientCode || !mpin || !totpSecret} fontSize={13}>
                {connecting ? "Connecting..." : "Connect"}
              </Button>
              {status?.configured && (
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12.5 }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
          <p style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 10, lineHeight: 1.5 }}>
            The TOTP secret is the base32 key shown once when you enable TOTP login at smartapi.angelbroking.com -
            not the 6-digit code itself. MACRONI generates fresh codes from it on every login, so you only enter
            these once - the app reconnects automatically every time it opens.
          </p>
          {error && <div style={{ ...errorTextStyle, marginTop: 10 }}>{error}</div>}
        </Card>
      ) : (
        <Card padding="14px 20px">
          <button
            onClick={() => setShowForm(true)}
            style={{ background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 600 }}
          >
            Update credentials
          </button>
          {error && <div style={{ ...errorTextStyle, marginTop: 10 }}>{error}</div>}
        </Card>
      )}

      {status?.configured && (
        <Card padding="18px 20px">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>Live holdings</div>
            <Button onClick={handleSync} disabled={syncing || !holdings || holdings.length === 0}>
              {syncing ? "Syncing..." : "Sync to Portfolio"}
            </Button>
          </div>
          {syncResult && (
            <div style={{ fontSize: 12, color: "var(--status-good)", marginBottom: 10 }}>
              Synced {syncResult.synced} holding{syncResult.synced === 1 ? "" : "s"} to your Portfolio.
              {syncResult.unmapped.length > 0 &&
                ` ${syncResult.unmapped.length} position(s) couldn't be mapped to a ticker (F&O/other) and were skipped.`}
            </div>
          )}
          {holdingsLoading ? (
            <div style={loadingTextStyle}>Connecting to Angel One...</div>
          ) : !holdings || holdings.length === 0 ? (
            <div style={emptyTextStyle}>No holdings found in your Angel One account.</div>
          ) : (
            <Table
              rows={holdings}
              rowKey={(h) => `${h.tradingsymbol}-${h.exchange}`}
              columns={[
                { header: "Symbol", render: (h) => h.tradingsymbol },
                { header: "Exchange", render: (h) => h.exchange },
                { header: "Quantity", render: (h) => h.quantity },
                { header: "Avg. price", render: (h) => `${RUPEE}${h.averageprice}` },
                { header: "LTP", render: (h) => `${RUPEE}${h.ltp}` },
              ]}
            />
          )}
        </Card>
      )}
    </div>
  );
}
