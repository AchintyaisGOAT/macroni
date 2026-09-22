import { FirebaseError } from "firebase/app";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { PageHeader } from "../components/PageHeader";
import { errorTextStyle, inputStyle, labelStyle, loadingTextStyle } from "../styles";

const FRIENDLY_ERROR: Record<string, string> = {
  "auth/email-already-in-use": "That email already has an account - try logging in instead.",
  "auth/weak-password": "Password must be at least 6 characters.",
  "auth/invalid-credential": "That email or password doesn't match an account.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/too-many-requests": "Too many attempts - please wait a bit and try again.",
  "auth/network-request-failed": "Couldn't reach Google's servers - check your internet connection.",
  "auth/unauthorized-domain": "This app isn't authorized to sign in yet - contact the developer.",
};

function friendlyError(err: unknown): string {
  if (err instanceof FirebaseError) {
    return FRIENDLY_ERROR[err.code] ?? err.message;
  }
  return String(err);
}

export function Account() {
  const { user, loading, signUp, logIn, logOut, resetPassword } = useAuth();
  const [mode, setMode] = useState<"signup" | "login">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === "signup") {
        await signUp(email.trim(), password);
      } else {
        await logIn(email.trim(), password);
      }
      setEmail("");
      setPassword("");
    } catch (err) {
      setError(friendlyError(err));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReset() {
    if (!email.trim()) {
      setError("Enter your email above first, then click \"Forgot password?\"");
      return;
    }
    setError(null);
    try {
      await resetPassword(email.trim());
      setResetSent(true);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <PageHeader title="Account" />

      <Card padding="18px 20px" style={{ alignSelf: "center", width: 640, maxWidth: "100%" }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6 }}>
          Optional account
        </div>
        <p style={{ fontSize: 12.5, color: "var(--text-muted)", lineHeight: 1.6, marginBottom: 0 }}>
          MACRONI works fully without one. Everything else - your portfolio, broker connection, alerts, and
          AI features - works completely without ever visiting this page. Creating an account here just
          reserves your email for features we might add later; nothing is gated on it yet. Your password is
          checked by Google's Firebase Authentication, not stored or seen by MACRONI directly.
        </p>
      </Card>

      {loading ? (
        <Card padding="20px 22px" style={{ alignSelf: "center", width: 480, maxWidth: "100%" }}>
          <div style={loadingTextStyle}>Loading...</div>
        </Card>
      ) : user ? (
        <Card padding="20px 22px" style={{ alignSelf: "center", width: 480, maxWidth: "100%" }}>
          <div style={{ fontSize: 14, fontWeight: 700 }}>Signed in as {user.email}</div>
          <p style={{ fontSize: 12.5, color: "var(--text-secondary)", marginTop: 6 }}>
            Signing out doesn't affect your portfolio, broker connection, or anything else in the app.
          </p>
          <Button onClick={() => logOut()} style={{ marginTop: 12 }} fontSize={13}>
            Sign out
          </Button>
        </Card>
      ) : (
        <Card padding="20px 22px" style={{ alignSelf: "center", width: 480, maxWidth: "100%" }}>
          <div style={{ display: "flex", gap: 16, marginBottom: 16, borderBottom: "1px solid var(--gridline)" }}>
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setError(null);
                  setResetSent(false);
                }}
                style={{
                  background: "transparent",
                  border: "none",
                  padding: "0 0 10px 0",
                  fontSize: 13.5,
                  fontWeight: 700,
                  color: mode === m ? "var(--text-primary)" : "var(--text-muted)",
                  borderBottom: "2px solid transparent",
                  backgroundImage: mode === m ? "var(--brand-gradient)" : "none",
                  WebkitBackgroundClip: mode === m ? "text" : undefined,
                  backgroundClip: mode === m ? "text" : undefined,
                  WebkitTextFillColor: mode === m ? "transparent" : undefined,
                }}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div>
              <label style={labelStyle}>Email</label>
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
              <label style={labelStyle}>Password</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
                style={{ ...inputStyle, width: "100%" }}
              />
            </div>
            <Button
              type="submit"
              disabled={submitting || !email.trim() || password.length < 6}
              style={{ alignSelf: "flex-start" }}
              fontSize={13}
            >
              {submitting ? "Please wait..." : mode === "login" ? "Log in" : "Sign up"}
            </Button>
            {mode === "login" && (
              <button
                type="button"
                onClick={handleReset}
                style={{ alignSelf: "flex-start", background: "transparent", border: "none", color: "var(--text-secondary)", fontSize: 12.5, fontWeight: 600 }}
              >
                Forgot password?
              </button>
            )}
            {resetSent && (
              <div style={{ color: "var(--status-good)", fontSize: 12 }}>
                Password reset email sent - check your inbox.
              </div>
            )}
            {error && <div style={errorTextStyle}>{error}</div>}
          </form>
        </Card>
      )}
    </div>
  );
}
