import { useEffect, useState } from "react";
import { api, type UpdateCheck } from "../api/client";

function extractErrorDetail(err: unknown): string {
  const message = String(err instanceof Error ? err.message : err);
  const jsonStart = message.indexOf("{");
  if (jsonStart === -1) return message;
  try {
    const parsed = JSON.parse(message.slice(jsonStart));
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // fall through to raw message
  }
  return message;
}

function parseVersion(v: string): number[] {
  return v
    .trim()
    .replace(/^v/i, "")
    .split(".")
    .map((part) => parseInt(part, 10) || 0);
}

function isNewer(latest: string, current: string): boolean {
  const a = parseVersion(latest);
  const b = parseVersion(current);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const diff = (a[i] ?? 0) - (b[i] ?? 0);
    if (diff !== 0) return diff > 0;
  }
  return false;
}

type InstallState = "idle" | "installing" | "restarting" | "error";

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateCheck | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [installState, setInstallState] = useState<InstallState>("idle");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .checkUpdate()
      .then((data) => {
        if (data.tag_name && isNewer(data.tag_name, data.current_version)) {
          setUpdate(data);
        }
      })
      .catch(() => {
        // No network, rate-limited, or repo not found - fail silently, this is a nicety.
      });
  }, []);

  async function handleInstall() {
    setError(null);
    setInstallState("installing");
    try {
      await api.installUpdate();
      // The installer's Restart Manager integration closes this app's process to
      // replace its files, then relaunches it - so losing the connection right
      // after this succeeds is the expected, normal outcome, not a failure.
      setInstallState("restarting");
    } catch (err) {
      setError(extractErrorDetail(err));
      setInstallState("error");
    }
  }

  if (!update || dismissed) return null;

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 12,
        background: "var(--surface-1)",
        boxShadow: "var(--shadow-card)",
        borderRadius: "var(--radius-md)",
        padding: "12px 16px",
        fontSize: 13,
      }}
    >
      {installState === "restarting" ? (
        <span>Update installed - MACRONI is restarting now...</span>
      ) : (
        <span>
          A new version is available: <strong>{update.tag_name}</strong> (you have v{update.current_version})
          {error && <span style={{ color: "var(--status-critical)", marginLeft: 10 }}>{error}</span>}
        </span>
      )}
      <span style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
        {installState !== "restarting" && update.installable && (
          <button
            onClick={handleInstall}
            disabled={installState === "installing"}
            style={{
              background: "var(--brand-gradient)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius-sm)",
              padding: "7px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              boxShadow: "0 4px 14px rgba(236, 72, 153, 0.28)",
            }}
          >
            {installState === "installing" ? "Installing..." : "Install & Restart"}
          </button>
        )}
        {installState !== "restarting" && update.html_url && (
          <a href={update.html_url} target="_blank" rel="noreferrer" style={{ color: "var(--brand-blue)", fontWeight: 700 }}>
            View on GitHub
          </a>
        )}
        {installState === "idle" && (
          <button
            onClick={() => setDismissed(true)}
            style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12 }}
          >
            Dismiss
          </button>
        )}
      </span>
    </div>
  );
}
