"use client";

import { useRouter } from "next/navigation";
import type { FormEvent } from "react";
import { useQuiz } from "../quiz-context";

export function WelcomeStep() {
  const router = useRouter();
  const { playerName, setPlayerName } = useQuiz();

  function continueToCategories(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("playerName") ?? "").trim();
    if (!name) return;
    setPlayerName(name);
    router.push("/categories");
  }

  return (
    <div className="start-screen">
      <span className="result-icon" aria-hidden="true">✦</span>
      <p className="question-kicker">STEP 1 · READY TO PLAY?</p>
      <h2 className="result-title">What should we call you?</h2>
      <p className="result-description">Your name will appear beside your score.</p>
      <form className="name-form" onSubmit={continueToCategories}>
        <label className="name-label" htmlFor="player-name">Your name</label>
        <input
          autoComplete="name"
          className="name-input"
          defaultValue={playerName}
          id="player-name"
          maxLength={24}
          name="playerName"
          placeholder="Enter your name"
          required
        />
        <button className="restart-button" type="submit">Continue</button>
      </form>
    </div>
  );
}
