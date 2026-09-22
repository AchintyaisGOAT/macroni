import { useState } from "react";
import { api } from "../api/client";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { extractErrorDetail } from "../lib/errors";
import { errorTextStyle, formCardWidth, inputStyle, labelStyle } from "../styles";

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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Support" subtitle="Report a bug or send feedback" />

      <Card padding="18px 20px" style={{ alignSelf: "center", width: formCardWidth, maxWidth: "100%" }}>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, margin: 0 }}>
          Found something broken, or have an idea for the app? Leave your email below so we can get back to
          you, describe what happened, and hit send.
        </p>
      </Card>

      <Card padding="20px 22px" style={{ alignSelf: "center", width: formCardWidth, maxWidth: "100%" }}>
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
              <label style={labelStyle}>
                Your email
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <div>
              <label style={labelStyle}>
                What's going on?
              </label>
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Describe the bug or your feedback in as much detail as you can..."
                rows={7}
                style={{ ...inputStyle, width: "100%", resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }}
              />
            </div>
            <Button type="submit" disabled={sending || !email.trim() || !message.trim()} style={{ alignSelf: "flex-start" }}>
              {sending ? "Sending..." : "Send"}
            </Button>
            {error && <div style={errorTextStyle}>{error}</div>}
          </form>
        )}
      </Card>
    </div>
  );
}
