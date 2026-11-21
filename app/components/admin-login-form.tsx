"use client";

import { useEffect, useState, type FormEvent } from "react";

export function AdminLoginForm() {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    void fetch("/api/admin/auth/session", { cache: "no-store" })
      .then(async (response) => {
        const data = (await response.json()) as { admin?: { name: string; email: string } | null };
        if (active && response.ok && data.admin) window.location.replace("/admin");
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setCheckingSession(false);
      });
    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    const formData = new FormData(event.currentTarget);
    try {
      const response = await fetch("/api/admin/auth/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.get("email"), password: formData.get("password") }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) {
        setError(data.error ?? "Could not sign in. Please try again.");
        return;
      }
      window.location.assign("/admin");
    } catch {
      setError("Could not connect. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="start-screen">
      <p className="question-kicker">ADMINISTRATOR ACCESS</p>
      <h2 className="result-title">Admin login</h2>
      <p className="result-description">Sign in with your administrator account.</p>
      {checkingSession ? <p role="status">Checking admin session…</p> : null}
      {!checkingSession ? (
      <form className="name-form" onSubmit={submit}>
        <label className="name-label" htmlFor="admin-email">Email</label>
        <input className="name-input" id="admin-email" name="email" type="email" autoComplete="username" required />
        <label className="name-label" htmlFor="admin-password">Password</label>
        <input className="name-input" id="admin-password" name="password" type="password" autoComplete="current-password" required />
        <button className="restart-button" type="submit" disabled={submitting}>
          {submitting ? "Signing in…" : "Admin login"}
        </button>
        {error ? <p className="auth-message" role="alert">{error}</p> : null}
      </form>
      ) : null}
    </div>
  );
}
