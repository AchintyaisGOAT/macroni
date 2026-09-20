import { useEffect, useState } from "react";
import { api, type NewsItem } from "../api/client";

const SOURCES = [
  { value: "", label: "All sources" },
  { value: "market_news", label: "Market news" },
  { value: "yahoo_finance", label: "Yahoo Finance" },
  { value: "marketwatch", label: "MarketWatch" },
  { value: "fed_all", label: "Federal Reserve" },
  { value: "fed_monetary", label: "Fed (monetary policy)" },
  { value: "ecb", label: "ECB" },
  { value: "boe", label: "Bank of England" },
  { value: "boj", label: "Bank of Japan" },
];

const SOURCE_LABEL: Record<string, string> = Object.fromEntries(SOURCES.map((s) => [s.value, s.label]));

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const diffSec = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function NewsCard({ item, featured }: { item: NewsItem; featured?: boolean }) {
  return (
    <a
      href={item.link}
      target="_blank"
      rel="noreferrer"
      style={{
        background: "var(--surface-1)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        overflow: "hidden",
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: featured ? "row" : "column",
        gridColumn: featured ? "1 / -1" : undefined,
      }}
    >
      <div
        style={{
          flexShrink: 0,
          width: featured ? "42%" : "100%",
          aspectRatio: featured ? undefined : "16 / 9",
          minHeight: featured ? 220 : undefined,
          position: "relative",
          background: "var(--brand-gradient)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "#fff",
          fontWeight: 800,
          fontSize: featured ? 32 : 20,
        }}
      >
        {(SOURCE_LABEL[item.source] ?? item.source).slice(0, 2).toUpperCase()}
        {item.image_url && (
          <img
            src={item.image_url}
            alt=""
            loading="lazy"
            decoding="async"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }}
            onError={(e) => {
              e.currentTarget.style.display = "none";
            }}
          />
        )}
      </div>
      <div
        style={{
          padding: featured ? "20px 24px" : "14px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
          minWidth: 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 11, color: "var(--text-muted)" }}>
          <span style={{ fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: 0.3 }}>
            {SOURCE_LABEL[item.source] ?? item.source}
          </span>
          <span style={{ flexShrink: 0 }}>{relativeTime(item.published_at)}</span>
        </div>
        <div style={{ fontWeight: 700, fontSize: featured ? 19 : 14, lineHeight: 1.35 }}>{item.title}</div>
        {item.summary && (
          <p
            style={{
              fontSize: featured ? 13.5 : 12.5,
              color: "var(--text-secondary)",
              lineHeight: 1.55,
              margin: 0,
              display: "-webkit-box",
              WebkitLineClamp: featured ? 4 : 3,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {item.summary}
          </p>
        )}
      </div>
    </a>
  );
}

export function News() {
  const [news, setNews] = useState<NewsItem[]>([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    const n = await api.news(50, source || undefined);
    setNews(n);
    setLoading(false);
  }

  useEffect(() => {
    setLoading(true);
    load();
    const interval = setInterval(load, 5 * 60_000);
    return () => clearInterval(interval);
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
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
          {news.map((item, i) => (
            <NewsCard key={item.id} item={item} featured={i === 0} />
          ))}
        </div>
      )}
    </div>
  );
}
