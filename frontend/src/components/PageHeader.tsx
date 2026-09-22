import type { CSSProperties, ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  style?: CSSProperties;
}

// Every page gets one of these at the top: a title so the page identifies
// itself (previously none did - the sidebar highlight was the only cue),
// plus a slot for page-level actions (refresh buttons, freshness timestamps,
// etc.). A 3-column grid (spacer / title / actions) with matching 1fr edges
// keeps the title block genuinely centered on the page regardless of
// whether - or how wide - the actions slot is, rather than centering only
// within the leftover space next to it.
export function PageHeader({ title, subtitle, actions, style }: PageHeaderProps) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: 16,
        ...style,
      }}
    >
      <div aria-hidden />
      <div style={{ textAlign: "center" }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: -0.4, margin: 0 }}>{title}</h1>
        {subtitle && <p style={{ fontSize: 13, color: "var(--text-muted)", margin: "4px 0 0" }}>{subtitle}</p>}
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, flexWrap: "wrap" }}>
        {actions}
      </div>
    </div>
  );
}
