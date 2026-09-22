import { MessageCircle, X } from "lucide-react";
import { useState } from "react";
import { api, type ChatMessage } from "../api/client";
import { Button } from "./Button";
import { chatBubbleStyle } from "../styles";

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
          className="macroni-animate-in"
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
            transformOrigin: "bottom right",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              background: "var(--brand-gradient)",
              color: "var(--on-brand)",
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
              style={{ background: "transparent", border: "none", color: "var(--on-brand)", cursor: "pointer", lineHeight: 1, padding: 2, display: "flex" }}
            >
              <X size={16} />
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
              <div key={i} style={chatBubbleStyle(m.role, true)}>
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
            <Button type="submit" disabled={sending || !input.trim()} style={{ padding: "8px 14px", flexShrink: 0 }} fontSize={12}>
              Send
            </Button>
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
          color: "var(--on-brand)",
          border: "none",
          boxShadow: "0 10px 30px rgba(252, 70, 107, 0.4)",
          cursor: "pointer",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          transition: "transform 0.15s ease",
        }}
      >
        <MessageCircle size={24} />
      </button>
    </>
  );
}
