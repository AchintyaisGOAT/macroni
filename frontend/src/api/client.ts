const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export interface Signal {
  name: string;
  value: number;
  zscore: number | null;
  percentile: number | null;
  label: string;
  computed_at: string;
}

export interface RiskFlag {
  signal: string;
  severity: "low" | "medium" | "high";
  explanation: string;
}

export interface RegimeReport {
  regime_label: string;
  narrative: string;
  risk_flags: RiskFlag[];
  portfolio_commentary: string;
  created_at: string;
}

export interface Holding {
  id: number;
  ticker: string;
  quantity: number;
  asset_class: string;
  region: string;
}

export interface ExposureDetail {
  ticker: string;
  quantity: number;
  asset_class: string;
  region: string;
  price: number | null;
  value: number;
  weight: number;
  beta: number | null;
}

export interface Exposures {
  total_value: number;
  holdings: ExposureDetail[];
  by_asset_class: Record<string, number>;
  by_region: Record<string, number>;
  by_sector: Record<string, number>;
  portfolio_beta: number | null;
  portfolio_duration_years: number | null;
  duration_coverage: number;
}

export interface AlertEvent {
  id: number;
  rule_id: string;
  severity: "low" | "medium" | "high";
  signal_name: string;
  value: number;
  explanation: string;
  active: boolean;
  created_at: string;
  resolved_at: string | null;
}

export interface NewsItem {
  id: number;
  source: string;
  title: string;
  link: string;
  summary: string;
  published_at: string | null;
}

export interface RegimeStatus {
  status: "never_run" | "ok" | "skipped" | "error";
  reason: string | null;
}

export interface Status {
  fred_configured: boolean;
  ai_configured: boolean;
  app_version: string;
  github_repo: string;
  last_regime_status: RegimeStatus;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quote_type: string;
  sector: string | null;
}

export const api = {
  status: () => request<Status>("/api/status"),
  signals: () => request<Signal[]>("/api/signals"),
  signalHistory: (name: string, limit = 60) =>
    request<Signal[]>(`/api/signals/${encodeURIComponent(name)}/history?limit=${limit}`),
  regime: () => request<RegimeReport | null>("/api/regime"),
  refreshRegime: () => request<RegimeStatus>("/api/regime/refresh", { method: "POST" }),

  holdings: () => request<Holding[]>("/api/portfolio/holdings"),
  addHolding: (h: Omit<Holding, "id">) =>
    request<Holding>("/api/portfolio/holdings", { method: "POST", body: JSON.stringify(h) }),
  deleteHolding: (id: number) => request<void>(`/api/portfolio/holdings/${id}`, { method: "DELETE" }),
  importHoldingsCsv: async (file: File) => {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${BASE_URL}/api/portfolio/import`, { method: "POST", body: form });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  exposures: () => request<Exposures>("/api/portfolio/exposures"),
  searchTickers: (q: string, limit = 8) =>
    request<TickerSearchResult[]>(`/api/portfolio/search?q=${encodeURIComponent(q)}&limit=${limit}`),

  alerts: (limit = 50) => request<AlertEvent[]>(`/api/alerts?limit=${limit}`),
  alertRules: () => request<Record<string, unknown>[]>("/api/alerts/rules"),

  news: (limit = 30, source?: string) =>
    request<NewsItem[]>(`/api/news?limit=${limit}${source ? `&source=${encodeURIComponent(source)}` : ""}`),
};
