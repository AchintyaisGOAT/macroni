// Backend errors sometimes arrive as a thrown Error whose .message is the raw
// HTTP response body (e.g. `{"detail": "..."}`) rather than a clean string.
// Pull the FastAPI `detail` field out when present, falling back to the raw
// message otherwise. Previously duplicated verbatim in 5 page/component files.
export function extractErrorDetail(err: unknown): string {
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
