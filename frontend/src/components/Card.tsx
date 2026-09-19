import type { CSSProperties, ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  style?: CSSProperties;
  padding?: string;
}

export function Card({ children, style, padding = "20px 22px" }: CardProps) {
  return (
    <div
      style={{
        background: "var(--surface-1)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-card)",
        padding,
        ...style,
      }}
    >
      {children}
    </div>
  );
}
