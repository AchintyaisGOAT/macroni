import { useEffect, useState } from "react";
import { api, type NewsItem } from "../api/client";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "fed_all", label: "Federal Reserve" },
  { value: "fed_monetary", label: "Fed (monetary policy)" },
  { value: "ecb", label: "ECB" },
  { value: "boe", label: "Bank of England" },
  { value: "boj", label: "Bank of Japan" },
  { value: "market_news", label: "Market news" },
];

export function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.news(50, source || undefined).then((n) => {
      setNews(n);
      setLoading(false);
    });
  }, [source]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <select
        value={source}
        onChange={(e) => setSource(e.target.value)}
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius-sm)",
          padding: "8px 12px",
          color: "var(--text-primary)",
          fontSize: 13,
          width: "fit-content",
          boxShadow: "var(--shadow-card)",
        }}
      >
        {SOURCES.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>

      {loading ? (
        <div style={{ color: "var(--text-muted)" }}>Loading...</div>
      ) : news.length === 0 ? (
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>No news yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {news.map((item) => (
            <a
              key={item.id}
              href={item.link}
              target="_blank"
              rel="noreferrer"
              style={{
                background: "var(--surface-1)",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-card)",
                padding: "12px 16px",
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
                <span style={{ fontSize: 13, fontWeight: 600 }}>{item.title}</span>
                <span style={{ fontSize: 11, color: "var(--text-muted)", flexShrink: 0 }}>
                  {item.published_at ? new Date(item.published_at).toLocaleDateString() : ""}
                </span>
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{item.source}</div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
