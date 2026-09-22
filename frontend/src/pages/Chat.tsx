import { useState } from "react";
import { api, type ChatMessage } from "../api/client";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { chatBubbleStyle, eyebrowGradientStyle } from "../styles";

const SUGGESTIONS = [
  "What's the current macro regime in plain English?",
  "What if interest rates rise by 1%?",
  "How exposed is my portfolio to a stock market downturn?",
  "Why is the credit spread signal flashing stress?",
];

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  async function send(question: string) {
    if (!question.trim() || sending) return;
    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: question }];
    setMessages(nextMessages);
    setInput("");
    setSending(true);
    try {
      const { answer } = await api.chat(question, messages);
      setMessages([...nextMessages, { role: "assistant", content: answer }]);
    } catch (err) {
      setMessages([...nextMessages, { role: "assistant", content: `Sorry, something went wrong: ${err}` }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", gap: 16 }}>
      <PageHeader title="Chat" subtitle="Ask about your signals, portfolio, or a hypothetical scenario" />
      <Card style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }} padding="0">
        <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
          {messages.length === 0 && (
            <div>
              <div style={{ ...eyebrowGradientStyle, marginBottom: 8 }}>Ask about your portfolio</div>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.6, marginBottom: 16 }}>
                Ask a question about your current signals, portfolio, or a hypothetical scenario. The AI
                answers only from your actual data - it won't tell you what to buy or sell.
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s}
                    onClick={() => send(s)}
                    style={{
                      textAlign: "left",
                      background: "var(--page-plane)",
                      border: "none",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 14px",
                      fontSize: 13,
                      color: "var(--text-primary)",
                    }}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} style={chatBubbleStyle(m.role)}>
              {m.content}
            </div>
          ))}

          {sending && (
            <div
              style={{
                alignSelf: "flex-start",
                background: "var(--page-plane)",
                borderRadius: "var(--radius-md)",
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--text-muted)",
              }}
            >
              Thinking...
            </div>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          style={{
            display: "flex",
            gap: 8,
            padding: "14px 16px",
            borderTop: "1px solid var(--border)",
          }}
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
              padding: "10px 14px",
              fontSize: 13.5,
              color: "var(--text-primary)",
            }}
          />
          <Button type="submit" disabled={sending || !input.trim()} style={{ padding: "10px 20px" }} fontSize={13}>
            Send
          </Button>
        </form>
      </Card>
    </div>
  );
}
