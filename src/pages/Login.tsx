import { useState, type FormEvent } from "react";
import { ArrowUpRight, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { api } from "../api";
import { Brand, ErrorBox, Field, Form, Text } from "../components";
import type { User } from "../types";
import type { Auth } from "../workspace";

export function Login({ onAuth, expired }: { onAuth: (x: Auth) => void; expired: boolean }) {
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const f = new FormData(e.currentTarget);
    try {
      onAuth(
        await api<Auth>("/auth/login", {
          method: "POST",
          body: JSON.stringify({
            email: f.get("email"),
            password: f.get("password"),
          }),
        }),
      );
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login">
      <section className="login-story">
        <Brand />
        <div className="story-content">
          <span className="eyebrow">THE TEAM BEHIND THE TIMETABLE</span>
          <h1>
            Every school.
            <br />
            Every teacher.
            <br />
            <em>In sync.</em>
          </h1>
          <p>A shared workspace for the people bringing robotics into the classroom.</p>
          <div className="login-rule">
            <ShieldCheck size={22} />
            <div>
              <strong>One team. One schedule.</strong>
              <span>Secure access for authorized staff.</span>
            </div>
          </div>
        </div>
        <span className="story-footer">IM-Telligence · Robotics education</span>
      </section>
      <section className="login-form">
        <div className="login-card">
          <div className="mobile-brand">
            <Brand />
          </div>
          <span className="eyebrow">WELCOME BACK</span>
          <h2>Robotics Schedule Manager</h2>
          <p>Sign in to your team’s workspace.</p>
          {expired && <div className="notice">Your session ended. Sign in again to continue.</div>}
          <form onSubmit={submit}>
            <Field label="Email">
              <input
                name="email"
                type="email"
                placeholder="you@im-telligence.com"
                required
                autoComplete="username"
              />
            </Field>
            <Field label="Password">
              <input
                name="password"
                type="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                maxLength={256}
              />
            </Field>
            <ErrorBox error={error} />
            <button className="button primary login-submit" disabled={busy}>
              {busy ? (
                <Loader2 className="spin" size={18} />
              ) : (
                <>
                  Sign In <ArrowUpRight size={18} />
                </>
              )}
            </button>
          </form>
          <div className="login-help">
            <KeyRound size={16} />
            <span>Need access or a password reset? Contact your Super Admin.</span>
          </div>
        </div>
      </section>
    </div>
  );
}

export function PasswordPage({ user, onAuth }: { user: User; onAuth: (x: Auth) => void }) {
  return (
    <div className="password-page">
      <div className="password-card">
        <Brand />
        <h1>Choose your password</h1>
        <p>Hello {user.full_name}. Replace your temporary password to open the workspace.</p>
        <PasswordForm onAuth={onAuth} onClose={() => {}} forced />
      </div>
    </div>
  );
}
export function PasswordForm({
  onAuth,
  onClose,
  forced = false,
}: {
  onAuth: (x: Auth) => void;
  onClose: () => void;
  forced?: boolean;
}) {
  return (
    <Form
      onCancel={onClose}
      label="Change password"
      onSave={async (f) => {
        if (f.get("new_password") !== f.get("confirm"))
          throw new Error("New passwords do not match.");
        const auth = await api<Auth>("/auth/password", {
          method: "POST",
          body: JSON.stringify({
            current_password: f.get("current_password"),
            new_password: f.get("new_password"),
          }),
        });
        onAuth(auth);
        onClose();
      }}
    >
      <Field label={forced ? "Temporary password" : "Current password"}>
        <input
          type="password"
          name="current_password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </Field>
      <Field label="New password · at least 12 characters">
        <Text name="new_password" type="password" minLength={12} maxLength={256} />
      </Field>
      <Field label="Confirm new password">
        <Text name="confirm" type="password" minLength={12} maxLength={256} />
      </Field>
    </Form>
  );
}
