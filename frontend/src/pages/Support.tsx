import { useState } from "react";
import { api } from "../api/client";
import { Card } from "../components/Card";

function extractErrorDetail(err: unknown): string {
  const message = String(err instanceof Error ? err.message : err);
  const jsonStart = message.indexOf("{");
  if (jsonStart === -1) return message;
  try {
    const parsed = JSON.parse(message.slice(jsonStart));
    if (typeof parsed.detail === "string") return parsed.detail;
  } catch {
    // fall through to raw message
  }
  return message;
}

const inputStyle: React.CSSProperties = {
  background: "var(--page-plane)",
  border: "none",
  borderRadius: "var(--radius-sm)",
  padding: "10px 14px",
  color: "var(--text-primary)",
  fontSize: 13.5,
  width: "100%",
};

export function Support() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSending(true);
    try {
      await api.sendSupportMessage(email.trim(), message.trim());
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(extractErrorDetail(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}>
      <Card padding="18px 20px">
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
          Report a bug or send feedback
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 0 }}>
          Found something broken, or have an idea for the app? Leave your email below so we can get back to
          you, describe what happened, and hit send.
        </p>
      </Card>

      <Card padding="20px 22px">
        {sent ? (
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "var(--status-good)" }}>Sent - thank you.</div>
            <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }}>
              We'll follow up at the email you provided if we need more details.
            </p>
            <button
              onClick={() => setSent(false)}
              style={{ marginTop: 10, background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 600 }}
            >
              Send another message
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, display: "block" }}>
                Your email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, color: "var(--text-secondary)", fontWeight: 600, marginBottom: 4, display: "block" }}>
                What's going on?
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the bug or your feedback in as much detail as you can..."
                rows={7}
                style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </div>
            <button
              type="submit"
              disabled={sending || !email.trim() || !message.trim()}
              style={{
                alignSelf: "flex-start",
                background: "var(--brand-gradient)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "10px 22px",
                fontSize: 13,
                fontWeight: 600,
                boxShadow: "0 4px 14px rgba(236, 72, 153, 0.28)",
              }}
            >
              {sending ? "Sending..." : "Send"}
            </button>
            {error && <div style={{ color: "var(--status-critical)", fontSize: 12 }}>{error}</div>}
          </form>
        )}
      </Card>
    </div>
  );
}
