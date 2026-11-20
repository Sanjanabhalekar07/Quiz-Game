"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "../quiz-context";

export function WelcomeStep() {
  const router = useRouter();
  const { hydrated, playerName, setPlayerName } = useQuiz();
  const [mode, setMode] = useState<"login" | "signup" | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (hydrated && playerName) router.replace("/categories");
  }, [hydrated, playerName, router]);

  async function submitAuthForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    const formData = new FormData(event.currentTarget);
    const response = await fetch("/api/auth/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.get("name"),
        email: formData.get("email"),
        password: formData.get("password"),
      }),
    }).catch(() => null);

    if (!response) {
      setMessage("Could not connect. Check your connection and try again.");
      return;
    }

    const result = (await response.json().catch(() => ({}))) as {
      name?: string;
      email?: string;
      error?: string;
    };
    if (!response.ok || !result.name || !result.email) {
      setMessage(result.error ?? "Could not sign in. Please try again.");
      return;
    }

    setPlayerName(result.name, result.email);
    router.push("/categories");
  }

  if (!hydrated || playerName) {
    return <div className="quiz-loading" role="status">Taking you to categories…</div>;
  }

  return (
    <div className="start-screen">
      <span className="result-icon" aria-hidden="true">âœ¦</span>
      <p className="question-kicker">STEP 1 Â· READY TO PLAY?</p>
      <h2 className="result-title">Welcome to Brightside</h2>
      <p className="result-description">Log in or create an account to start playing.</p>
      {mode ? (
        <form className="name-form" onSubmit={submitAuthForm}>
          {mode === "signup" && (
            <>
              <label className="name-label" htmlFor="player-name">Your name</label>
              <input autoComplete="name" className="name-input" id="player-name" maxLength={40} name="name" placeholder="Enter your name" required />
            </>
          )}
          <label className="name-label" htmlFor="account-email">Email</label>
          <input className="name-input" id="account-email" name="email" type="email" autoComplete="email" placeholder="you@example.com" required />
          <label className="name-label" htmlFor="account-password">Password</label>
          <input className="name-input" id="account-password" name="password" type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} minLength={8} maxLength={128} placeholder="At least 8 characters" required />
          <button className="restart-button" type="submit">{mode === "signup" ? "Sign in" : "Log in"}</button>
          {message && <p className="auth-message" role="status">{message}</p>}
          <button className="auth-switch" type="button" onClick={() => setMode(null)}>Back</button>
        </form>
      ) : (
        <div className="auth-actions">
          <button className="restart-button" type="button" onClick={() => setMode("login")}>Login</button>
          <button className="restart-button auth-secondary" type="button" onClick={() => setMode("signup")}>Sign in</button>
        </div>
      )}
    </div>
  );
}
