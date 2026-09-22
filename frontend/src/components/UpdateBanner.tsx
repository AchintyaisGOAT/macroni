import { useEffect, useState } from "react";
import { api, type UpdateCheck } from "../api/client";
import { extractErrorDetail } from "../lib/errors";
import { Button } from "./Button";

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
      setInstallState("restarting");
    } catch (err) {
      // The backend's own process gets closed (to let the installer overwrite its
      // files) moments after it kicks off the install - if that happens before the
      // HTTP response fully arrives, the fetch itself throws a network-level
      // TypeError ("Failed to fetch"), not a real HTTP error response. That's
      // actually the expected shape of success here, not a failure - only a
      // genuine HTTP error status (the server responding on purpose) means it
      // truly failed before reaching that point.
      if (err instanceof TypeError) {
        setInstallState("restarting");
      } else {
        setError(extractErrorDetail(err));
        setInstallState("error");
      }
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
          <Button onClick={handleInstall} disabled={installState === "installing"} style={{ padding: "7px 16px" }}>
            {installState === "installing" ? "Installing..." : "Install & Restart"}
          </Button>
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
