import { useEffect, useState } from "react";
import { api, type AlertEvent } from "../api/client";
import { AlertItem } from "../components/AlertItem";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { extractErrorDetail } from "../lib/errors";
import { emptyTextStyle, errorTextStyle, loadingTextStyle, sectionLabelStyle } from "../styles";

export function Alerts() {
  const [alerts, setAlerts] = useState<AlertEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .alerts()
      .then((a) => setAlerts(a))
      .catch((err) => setError(extractErrorDetail(err)))
      .finally(() => setLoading(false));
    const interval = setInterval(() => {
      api.alerts().then(setAlerts).catch(() => {
        // Best-effort background refresh - the next successful poll will catch up.
      });
    }, 60_000);
    return () => clearInterval(interval);
  }, []);

  const active = alerts.filter((a) => a.active);
  const resolved = alerts.filter((a) => !a.active);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Alerts" subtitle="Rule-based alerts triggered by your signals" />

      {loading ? (
        <div style={loadingTextStyle}>Loading...</div>
      ) : error ? (
        <div style={errorTextStyle}>{error}</div>
      ) : (
        <>
          <div>
            <div style={{ ...sectionLabelStyle, marginBottom: 10 }}>Active ({active.length})</div>
            {active.length === 0 ? (
              <Card padding="16px 18px">
                <div style={emptyTextStyle}>No active alerts.</div>
              </Card>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {active.map((a) => (
                  <AlertItem key={a.id} alert={a} />
                ))}
              </div>
            )}
          </div>

          {resolved.length > 0 && (
            <div>
              <div style={{ ...sectionLabelStyle, marginBottom: 10 }}>Resolved ({resolved.length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {resolved.map((a) => (
                  <AlertItem key={a.id} alert={a} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
