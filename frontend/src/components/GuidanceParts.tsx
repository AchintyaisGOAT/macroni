import type { TradeCall, TradeGuidance } from "../api/client";
import { Button } from "./Button";
import { ZoneBadge } from "./ZoneBadge";

// Shared pieces between Watchlist.tsx and TradeGuidancePanel.tsx - both
// render an AI trade-guidance table for a different set of tickers (a
// watchlist vs. actual holdings), but the "AI call" cell, the refresh
// header, and the guidance footer text were previously copy-pasted
// byte-for-byte in both files.

export function AiCallCell({ call }: { call: TradeCall | undefined }) {
  if (!call) return <span style={{ color: "var(--text-muted)" }}>Not requested yet</span>;
  return (
    <div>
      <ZoneBadge zone={call.call} />
      <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4, lineHeight: 1.5 }}>{call.rationale}</div>
    </div>
  );
}

interface GuidanceHeaderProps {
  title: string;
  subtitle?: string;
  onRefresh: () => void;
  refreshing: boolean;
  disabled: boolean;
}

export function GuidanceHeader({ title, subtitle, onRefresh, refreshing, disabled }: GuidanceHeaderProps) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12, gap: 12 }}>
      <div>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)" }}>{title}</div>
        {subtitle && <div style={{ fontSize: 11.5, color: "var(--text-muted)", marginTop: 2 }}>{subtitle}</div>}
      </div>
      <Button onClick={onRefresh} disabled={refreshing || disabled} style={{ flexShrink: 0 }}>
        {refreshing ? "Asking AI..." : "Get AI Guidance"}
      </Button>
    </div>
  );
}

export function GuidanceFooter({ guidance }: { guidance: TradeGuidance | null }) {
  return (
    <>
      {guidance?.overall_note && (
        <p style={{ fontSize: 13, color: "var(--text-primary)", marginTop: 14, lineHeight: 1.6 }}>{guidance.overall_note}</p>
      )}
      <p
        style={{
          fontSize: 11,
          color: "var(--text-muted)",
          marginTop: 14,
          paddingTop: 12,
          borderTop: "1px solid var(--gridline)",
          lineHeight: 1.5,
        }}
      >
        {guidance?.disclaimer ??
          "Generated from quantitative technical signals and macro data only. Not registered investment advice, not personalized to your full financial situation, and not a guarantee of future performance. You are solely responsible for your own trading decisions."}
      </p>
    </>
  );
}
