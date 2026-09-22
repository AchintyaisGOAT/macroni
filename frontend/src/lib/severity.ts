// low/medium/high severity color, shared by alerts, investment tips, and
// regime risk flags. Previously redefined identically in 3 components.
export const SEVERITY_COLOR: Record<string, string> = {
  low: "var(--status-good)",
  medium: "var(--status-warning)",
  high: "var(--status-critical)",
};

export function severityColor(severity: string): string {
  return SEVERITY_COLOR[severity] ?? "var(--text-muted)";
}
