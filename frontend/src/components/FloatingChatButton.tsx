import { useState } from "react";
import { api, type ChatMessage } from "../api/client";

function ChatIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path
        d="M4 5.5C4 4.67 4.67 4 5.5 4h13c.83 0 1.5.67 1.5 1.5v9c0 .83-.67 1.5-1.5 1.5H9l-4 4v-4H5.5C4.67 16 4 15.33 4 14.5v-9Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function FloatingChatButton() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(question: string) {
    if (!question.trim() || sending) return;
    const next: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(next);
    setInput("");
    setSending(true);
    try {
      const { answer } = await api.chat(question, messages);
      setMessages([...next, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages([...next, { role: "assistant", content: `Sorry, something went wrong: ${err}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      {open && (
        <div
          style={{
            position: "fixed",
            bottom: 92,
            right: 24,
            width: 340,
            maxHeight: "min(480px, 70vh)",
            display: "flex",
            flexDirection: "column",
            background: "var(--surface-1)",
            borderRadius: "var(--radius-lg)",
            boxShadow: "0 24px 60px rgba(0, 0, 0, 0.3)",
            overflow: "hidden",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              background: "var(--brand-gradient)",
              color: "#fff",
              fontWeight: 700,
              fontSize: 13,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            Ask MACRONI
            <button
              onClick={() => setOpen(false)}
              aria-label="Close chat"
              style={{ background: "transparent", border: "none", color: "#fff", fontSize: 18, cursor: "pointer", lineHeight: 1, padding: 2 }}
            >
              &times;
            </button>
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10, minHeight: 140 }}>
            {messages.length === 0 && (
              <div style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.5 }}>
                Ask about your portfolio, signals, or a what-if scenario - answered from your live data, from
                anywhere in the app.
              </div>
            )}
            {messages.map((m, i) => (
              <div
                key={i}
                style={{
                  alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                  maxWidth: "85%",
                  background: m.role === "user" ? "var(--brand-gradient)" : "var(--page-plane)",
                  color: m.role === "user" ? "#fff" : "var(--text-primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "8px 12px",
                  fontSize: 12.5,
                  lineHeight: 1.5,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content}
              </div>
            ))}
            {sending && <div style={{ fontSize: 12, color: "var(--text-muted)" }}>Thinking...</div>}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
            style={{ display: "flex", gap: 6, padding: 10, borderTop: "1px solid var(--border)", flexShrink: 0 }}
          >
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a question..."
              style={{
                flex: 1,
                background: "var(--page-plane)",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "8px 10px",
                fontSize: 12.5,
                color: "var(--text-primary)",
                minWidth: 0,
              }}
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              style={{
                background: "var(--brand-gradient)",
                color: "#fff",
                border: "none",
                borderRadius: "var(--radius-sm)",
                padding: "8px 14px",
                fontSize: 12,
                fontWeight: 600,
                flexShrink: 0,
              }}
            >
              Send
            </button>
          </form>
        </div>
      )}
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Close chat" : "Ask MACRONI"}
        style={{
          position: "fixed",
          bottom: 24,
          right: 24,
          width: 56,
          height: 56,
          borderRadius: "50%",
          background: "var(--brand-gradient)",
          color: "#fff",
          border: "none",
          boxShadow: "0 10px 30px rgba(236, 72, 153, 0.4)",
          cursor: "pointer",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease",
        }}
      >
        <ChatIcon />
      </button>
    </>
  );
}
