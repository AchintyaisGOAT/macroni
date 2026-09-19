import { useEffect, useRef, useState } from "react";
import { api, type TickerSearchResult } from "../api/client";

interface TickerSearchInputProps {
  value: string;
  onChange: (ticker: string) => void;
  onSelect: (result: TickerSearchResult) => void;
}

export function TickerSearchInput({ value, onChange, onSelect }: TickerSearchInputProps) {
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = value.trim();
    if (query.length < 1) {
      setResults([]);
      return;
    }
    setLoading(true);
    const handle = setTimeout(() => {
      api
        .searchTickers(query)
        .then((r) => {
          setResults(r);
          setOpen(true);
        })
        .catch(() => setResults([]))
        .finally(() => setLoading(false));
    }, 300);
    return () => clearTimeout(handle);
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", minWidth: 240 }}>
      <input
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          padding: "6px 10px",
          color: "var(--text-primary)",
          fontSize: 13,
          width: "100%",
        }}
        placeholder="Search company or ticker (e.g. Apple)"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
      />
      {open && (loading || results.length > 0) && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: 0,
            zIndex: 10,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            marginTop: 4,
            maxHeight: 260,
            overflowY: "auto",
            boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
          }}
        >
          {loading && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>Searching...</div>
          )}
          {!loading &&
            results.map((r) => (
              <div
                key={r.symbol}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(r);
                  setOpen(false);
                }}
                style={{
                  padding: "8px 10px",
                  cursor: "pointer",
                  borderBottom: "1px solid var(--gridline)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                  <strong style={{ fontSize: 13 }}>{r.symbol}</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: 11, flexShrink: 0 }}>{r.exchange}</span>
                </div>
                <div style={{ color: "var(--text-secondary)", fontSize: 12 }}>{r.name}</div>
              </div>
            ))}
          {!loading && results.length === 0 && (
            <div style={{ padding: "8px 10px", fontSize: 12, color: "var(--text-muted)" }}>No matches</div>
          )}
        </div>
      )}
    </div>
  );
}
