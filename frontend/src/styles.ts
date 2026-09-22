import type { CSSProperties } from "react";

// Shared, referenced style primitives - see the frontend scalability audit
// (buttons, inputs, badges, dots, section labels, status text were each
// independently re-typed as inline style objects across 10+ files). Every
// page should import from here instead of hand-rolling another copy.

export type ButtonVariant = "primary" | "ghost" | "danger";

interface ButtonStyleOptions {
  padding?: string;
  fontSize?: number;
}

/** The one gradient CTA button style, used everywhere from "Add holding" to
 * "Regenerate" to "Install & Restart". "ghost" is the muted secondary action
 * (Refresh, Cancel); "danger" is a bare text action (Remove). */
export function buttonStyle(variant: ButtonVariant = "primary", opts: ButtonStyleOptions = {}): CSSProperties {
  const { padding = "8px 16px", fontSize = 12.5 } = opts;
  const base: CSSProperties = {
    border: "none",
    borderRadius: "var(--radius-sm)",
    padding,
    fontSize,
    fontWeight: 600,
  };
  if (variant === "primary") {
    return {
      ...base,
      background: "var(--brand-gradient)",
      color: "var(--on-brand)",
      boxShadow: "var(--shadow-brand)",
    };
  }
  if (variant === "danger") {
    return { ...base, background: "transparent", color: "var(--status-critical)", padding: "0" };
  }
  // ghost
  return { ...base, background: "var(--page-plane)", color: "var(--text-primary)" };
}

export const inputStyle: CSSProperties = {
  background: "var(--surface-1)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 12px",
  color: "var(--text-primary)",
  fontSize: 13,
};

export const labelStyle: CSSProperties = {
  fontSize: 12,
  color: "var(--text-secondary)",
  fontWeight: 600,
  marginBottom: 4,
  display: "block",
};

/** A translucent tint of `color`, for badge/pill backgrounds - e.g.
 * `tint("var(--status-good)")`. Centralizes what was previously a
 * color-mix() formula copy-pasted with a different, arbitrarily-chosen
 * percentage (9/12/14/16%) at each call site. */
export function tint(color: string, pct = 14): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`;
}

export function pillStyle(color: string, opts: { strong?: boolean; pct?: number } = {}): CSSProperties {
  return {
    display: "inline-block",
    padding: "3px 10px",
    borderRadius: "var(--radius-pill)",
    fontSize: 11,
    fontWeight: opts.strong ? 800 : 600,
    color,
    background: tint(color, opts.pct ?? 14),
  };
}

export function dotStyle(color: string, size = 8): CSSProperties {
  return { width: size, height: size, borderRadius: "50%", background: color, flexShrink: 0, display: "inline-block" };
}

export const eyebrowGradientStyle: CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: "uppercase",
  background: "var(--brand-gradient)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
  display: "inline-block",
};

export const sectionLabelStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 600,
  color: "var(--text-secondary)",
};

/** Chat message bubble - shared by the full Chat page and the floating chat
 * widget (which just uses tighter padding/font-size via `compact`). */
export function chatBubbleStyle(role: "user" | "assistant", compact = false): CSSProperties {
  return {
    alignSelf: role === "user" ? "flex-end" : "flex-start",
    maxWidth: "80%",
    background: role === "user" ? "var(--brand-gradient)" : "var(--page-plane)",
    color: role === "user" ? "var(--on-brand)" : "var(--text-primary)",
    borderRadius: "var(--radius-md)",
    padding: compact ? "8px 12px" : "10px 14px",
    fontSize: compact ? 12.5 : 13.5,
    lineHeight: 1.5,
    whiteSpace: "pre-wrap",
  };
}

/** Width for a centered, narrow "form" card - Account's login card, Support's
 * message form, Broker's connect form. Previously three different hardcoded
 * widths (480/640/920) expressing the same "centered narrow form" intent. */
export const formCardWidth = 640;

export const mutedTextStyle: CSSProperties = { color: "var(--text-muted)", fontSize: 13 };
export const loadingTextStyle: CSSProperties = mutedTextStyle;
export const emptyTextStyle: CSSProperties = mutedTextStyle;
export const errorTextStyle: CSSProperties = { color: "var(--status-critical)", fontSize: 12 };
