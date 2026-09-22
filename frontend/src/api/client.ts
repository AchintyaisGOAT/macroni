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
  image_url: string | null;
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
  last_tips_status: RegimeStatus;
  last_updated: string | null;
}

export interface InvestmentTip {
  title: string;
  tip: string;
  category: "diversification" | "risk" | "cost" | "other";
  severity: "low" | "medium" | "high";
}

export interface TipsResponse {
  tips: InvestmentTip[];
  created_at: string | null;
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export interface TickerSearchResult {
  symbol: string;
  name: string;
  exchange: string;
  quote_type: string;
  sector: string | null;
}

export interface BrokerStatus {
  configured: boolean;
  connected: boolean;
  client_code: string | null;
}

export interface BrokerCredentials {
  api_key: string;
  client_code: string;
  mpin: string;
  totp_secret: string;
}

export interface BrokerHolding {
  tradingsymbol: string;
  exchange: string;
  quantity: number;
  averageprice: number;
  ltp: number;
  [key: string]: unknown;
}

export interface SyncResult {
  status: string;
  synced: number;
  unmapped: { tradingsymbol: string; exchange: string; quantity: number }[];
}

export interface TechnicalSignal {
  ticker: string;
  price: number;
  change_pct: number | null;
  rsi: number | null;
  sma50: number | null;
  sma200: number | null;
  momentum_zscore: number | null;
  score: number;
  zone: "strong_sell" | "sell" | "neutral" | "buy" | "strong_buy";
}

export interface TradeCall {
  ticker: string;
  call: "strong_buy" | "buy" | "hold" | "sell" | "strong_sell";
  confidence: "low" | "medium" | "high";
  rationale: string;
}

export interface TradeGuidance {
  calls: TradeCall[];
  overall_note: string;
  disclaimer: string;
  created_at: string | null;
}

export interface ExchangeStatus {
  code: string;
  name: string;
  region: string;
  timezone: string;
  is_open: boolean;
  local_time: string;
  next_change_at: string;
  next_change_label: "opens" | "closes";
}

export interface RegionSignal {
  code: string;
  name: string;
  index_ticker: string;
  index_name: string;
  price: number;
  return_1m_pct: number | null;
  momentum_zscore: number | null;
  volatility_value: number | null;
  volatility_label: "elevated" | "normal" | "subdued" | null;
  volatility_source: "implied" | "realized_percentile" | null;
}

export interface MarketStock {
  ticker: string;
  name: string;
  price: number;
  change_pct: number | null;
  zone: "strong_sell" | "sell" | "neutral" | "buy" | "strong_buy" | null;
  score: number | null;
}

export interface LiveQuote {
  ticker: string;
  price: number;
  change_pct: number;
}

export interface WatchlistItemT {
  id: number;
  ticker: string;
  name: string;
  region: string;
  price: number | null;
  change_pct: number | null;
  rsi: number | null;
  momentum_zscore: number | null;
  score: number | null;
  zone: "strong_sell" | "sell" | "neutral" | "buy" | "strong_buy" | null;
}

export interface UpdateCheck {
  current_version: string;
  tag_name: string | null;
  html_url: string | null;
  asset_name: string | null;
  installable: boolean;
}

export const api = {
  status: () => request<Status>("/api/status"),
  signals: () => request<Signal[]>("/api/signals"),
  signalHistory: (name: string, limit = 60) =>
    request<Signal[]>(`/api/signals/${encodeURIComponent(name)}/history?limit=${limit}`),
  regime: () => request<RegimeReport | null>("/api/regime"),
  refreshRegime: () => request<RegimeStatus>("/api/regime/refresh", { method: "POST" }),
  refreshData: () => request<{ status: string }>("/api/refresh", { method: "POST" }),

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

  tips: () => request<TipsResponse>("/api/tips"),
  refreshTips: () => request<RegimeStatus>("/api/tips/refresh", { method: "POST" }),

  chat: (question: string, history: ChatMessage[]) =>
    request<{ answer: string }>("/api/chat", { method: "POST", body: JSON.stringify({ question, history }) }),

  brokerStatus: () => request<BrokerStatus>("/api/broker/status"),
  saveBrokerCredentials: (creds: BrokerCredentials) =>
    request<{ status: string }>("/api/broker/credentials", { method: "POST", body: JSON.stringify(creds) }),
  brokerHoldings: () => request<BrokerHolding[]>("/api/broker/holdings"),
  syncBrokerToPortfolio: () => request<SyncResult>("/api/broker/sync-to-portfolio", { method: "POST" }),

  technicalSignals: () => request<TechnicalSignal[]>("/api/trade-guidance/technical-signals"),
  tradeGuidance: () => request<TradeGuidance>("/api/trade-guidance"),
  refreshTradeGuidance: () => request<{ status: string }>("/api/trade-guidance/refresh", { method: "POST" }),

  marketHours: () => request<ExchangeStatus[]>("/api/markets/hours"),
  regionSignals: () => request<RegionSignal[]>("/api/markets/regions"),
  marketStocks: (regionCode: string) => request<MarketStock[]>(`/api/markets/${regionCode}/stocks`),
  searchMarketStocks: (regionCode: string, q: string, limit = 15) =>
    request<TickerSearchResult[]>(`/api/markets/${regionCode}/search?q=${encodeURIComponent(q)}&limit=${limit}`),
  marketLiveQuotes: (regionCode: string) => request<LiveQuote[]>(`/api/markets/${regionCode}/live-quotes`),
  portfolioLiveQuotes: () => request<LiveQuote[]>("/api/portfolio/live-quotes"),

  sendSupportMessage: (senderEmail: string, message: string) =>
    request<{ status: string }>("/api/support", {
      method: "POST",
      body: JSON.stringify({ sender_email: senderEmail, message }),
    }),

  watchlist: () => request<WatchlistItemT[]>("/api/watchlist"),
  addToWatchlist: (ticker: string, name = "", region = "") =>
    request<WatchlistItemT>("/api/watchlist", { method: "POST", body: JSON.stringify({ ticker, name, region }) }),
  removeFromWatchlist: (id: number) => request<{ status: string }>(`/api/watchlist/${id}`, { method: "DELETE" }),
  watchlistGuidance: () => request<TradeGuidance>("/api/watchlist/guidance"),
  refreshWatchlistGuidance: () => request<{ status: string }>("/api/watchlist/guidance/refresh", { method: "POST" }),

  checkUpdate: () => request<UpdateCheck>("/api/update/check"),
  installUpdate: () => request<{ status: string }>("/api/update/install", { method: "POST" }),
};
