import { useEffect, useState } from "react";

interface UpdateBannerProps {
  currentVersion: string;
  githubRepo: string;
}

interface GithubRelease {
  tag_name: string;
  html_url: string;
  name: string;
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

export function UpdateBanner({ currentVersion, githubRepo }: UpdateBannerProps) {
  const [release, setRelease] = useState<GithubRelease | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!githubRepo || githubRepo.startsWith("PLACEHOLDER")) return;
    fetch(`https://api.github.com/repos/${githubRepo}/releases/latest`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: GithubRelease | null) => {
        if (data?.tag_name && isNewer(data.tag_name, currentVersion)) {
          setRelease(data);
        }
      })
      .catch(() => {
        // No network, rate-limited, or repo not found - fail silently, this is a nicety.
      });
  }, [currentVersion, githubRepo]);

  if (!release || dismissed) return null;

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
      <span>
        A new version is available: <strong>{release.tag_name}</strong> (you have v{currentVersion})
      </span>
      <span style={{ display: "flex", gap: 12, alignItems: "center", flexShrink: 0 }}>
        <a href={release.html_url} target="_blank" rel="noreferrer" style={{ color: "var(--brand-blue)", fontWeight: 700 }}>
          Download update
        </a>
        <button
          onClick={() => setDismissed(true)}
          style={{ background: "transparent", border: "none", color: "var(--text-muted)", fontSize: 12 }}
        >
          Dismiss
        </button>
      </span>
    </div>
  );
}
