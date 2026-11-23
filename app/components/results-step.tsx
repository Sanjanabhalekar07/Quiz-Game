"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "../quiz-context";
import { categoryClass, questionsPerRound, type ScoreEntry } from "../quiz-data";

export function ResultsStep() {
  const router = useRouter();
  const [replayError, setReplayError] = useState("");
  const {
    hydrated,
    playerName,
    selectedCategory,
    round,
    correctCount,
    isComplete,
    leaderboard,
    replayCategory,
    chooseAnotherCategory,
  } = useQuiz();
  const category = selectedCategory ?? round[0]?.category ?? "General Knowledge";
  const incorrectCount = round.length - correctCount;

  useEffect(() => {
    if (hydrated && !playerName) router.replace("/");
    else if (hydrated && !isComplete) router.replace(round.length ? "/quiz" : "/categories");
  }, [hydrated, isComplete, playerName, round.length, router]);

  if (!hydrated || !playerName || !isComplete || !round.length) {
    return <div className="quiz-loading" role="status">Getting your resultsâ€¦</div>;
  }

  async function replay() {
    const error = await replayCategory();
    if (error) setReplayError(error);
    else router.push("/quiz");
  }

  function chooseAnother() {
    chooseAnotherCategory();
    router.push("/categories");
  }

  return (
    <div className="results">
      <p className="question-kicker">STEP 4 | QUIZ COMPLETE</p>
      <h2 className="result-title">
        {correctCount === questionsPerRound
          ? "A perfect round!"
          : correctCount >= 7
            ? "Look at you go!"
            : correctCount >= 4
              ? "Nicely done!"
              : "Every day is a chance to learn."}
      </h2>
      <p className="result-description">
        <strong>{playerName}</strong>, you got <strong>{correctCount}</strong> out of {round.length} questions right.
      </p>
      <p className="result-category">
        Round theme: <span className={categoryClass(category)}>{category}</span>
      </p>

      <div className="score-summary">
        <div className="score-tile correct-tile">
          <span className="score-number">{correctCount}</span>
          <span className="score-label">Correct</span>
        </div>
        <div className="score-tile incorrect-tile">
          <span className="score-number">{incorrectCount}</span>
          <span className="score-label">Incorrect</span>
        </div>
      </div>

      <Leaderboard scores={leaderboard} />

      <div className="result-actions">
        <button className="restart-button" onClick={replay} type="button">
          <svg className="action-icon" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
            <path d="M13.5 4.5A5.5 5.5 0 0 0 4 3L2.5 4.5m0 0v-3m0 3h3M2.5 11.5A5.5 5.5 0 0 0 12 13l1.5-1.5m0 0v3m0-3h-3" />
          </svg>
          Give it another go
        </button>
        <button className="restart-button secondary-action choose-category-action" onClick={chooseAnother} type="button">
          <svg className="action-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
            <rect x="2" y="2" width="5" height="5" rx="1" />
            <rect x="9" y="2" width="5" height="5" rx="1" />
            <rect x="2" y="9" width="5" height="5" rx="1" />
            <rect x="9" y="9" width="5" height="5" rx="1" />
          </svg>
          Choose Category
        </button>
      </div>
      {replayError ? <p role="alert">{replayError}</p> : null}
      <p className="result-footnote">Thanks for playing. Stay curious!</p>
    </div>
  );
}

function Leaderboard({ scores }: { scores: ScoreEntry[] }) {
  return (
    <section className="leaderboard" aria-label="Top 10 scores">
      <div className="leaderboard-heading">
        <h3>Top 10 scores</h3>
        <span>Best rounds</span>
      </div>
      {scores.length ? (
        <ol className="leaderboard-list">
          {scores.map((entry, index) => (
            <li className={categoryClass(entry.category)} key={`${entry.playedAt}-${index}`}>
              <span className="leaderboard-rank">{index + 1}</span>
              <span className="leaderboard-name">{entry.name ?? "Player"}</span>
              <span className="leaderboard-category">{entry.category ?? "General Knowledge"}</span>
              <strong>{entry.score}/{questionsPerRound}</strong>
            </li>
          ))}
        </ol>
      ) : (
        <p className="leaderboard-empty">Your completed rounds will show up here.</p>
      )}
    </section>
  );
}
