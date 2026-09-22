import { useEffect, type ReactNode } from "react";
import { Card } from "./Card";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "var(--overlay-scrim)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        zIndex: 100,
      }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 480 }} className="macroni-animate-in">
        <Card padding="20px 22px" style={{ maxHeight: "85vh", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
            <div style={{ fontSize: 16, fontWeight: 700 }}>{title}</div>
            <button
              onClick={onClose}
              aria-label="Close"
              style={{
                border: "none",
                background: "var(--page-plane)",
                color: "var(--text-secondary)",
                borderRadius: "var(--radius-sm)",
                width: 26,
                height: 26,
                fontSize: 14,
                lineHeight: 1,
                flexShrink: 0,
              }}
            >
              ✕
            </button>
          </div>
          {children}
        </Card>
      </div>
    </div>
  );
}
