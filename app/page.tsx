"use client";

import Link from "next/link";
import type { FormEvent } from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { questionBank, type QuizQuestion } from "./questions";

const questionsPerRound = 10;
const secondsPerQuestion = 15;
const optionLetters = ["A", "B", "C", "D"];
const leaderboardKey = "brightside-quiz-leaderboard";
const playerNameKey = "brightside-quiz-player-name";

type ScoreEntry = { name: string; score: number; playedAt: number };

function shuffle<T>(items: readonly T[]): T[] {
  const shuffled = [...items];

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[randomIndex]] = [
      shuffled[randomIndex],
      shuffled[index],
    ];
  }

  return shuffled;
}

function createRound(): QuizQuestion[] {
  return shuffle(questionBank)
    .slice(0, questionsPerRound)
    .map((question) => ({
      ...question,
      options: shuffle(question.options),
    }));
}

export default function Home() {
  const [round, setRound] = useState<QuizQuestion[] | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const submittedRef = useRef(false);

  const question = round?.[questionIndex];
  const incorrectCount = (round?.length ?? questionsPerRound) - correctCount;

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(playerNameKey) ?? "";
      const savedScores = JSON.parse(
        window.localStorage.getItem(leaderboardKey) ?? "[]",
      ) as ScoreEntry[];
      setPlayerName(savedName);
      setNameInput(savedName);
      setLeaderboard(
        Array.isArray(savedScores)
          ? savedScores
              .filter(
                (entry) =>
                  typeof entry?.name === "string" &&
                  Number.isFinite(entry.score) &&
                  Number.isFinite(entry.playedAt),
              )
              .sort((a, b) => b.score - a.score || b.playedAt - a.playedAt)
              .slice(0, 10)
          : [],
      );
    } catch {
      setLeaderboard([]);
    }
  }, []);

  function startGame(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = nameInput.trim();
    if (!name) return;
    setPlayerName(name);
    try {
      window.localStorage.setItem(playerNameKey, name);
    } catch {
      // The current session can still be played when browser storage is unavailable.
    }
    setRound(createRound());
    setQuestionIndex(0);
    setCorrectCount(0);
    setTimeLeft(secondsPerQuestion);
    setIsComplete(false);
  }

  const submitAnswer = useCallback(
    (isCorrect: boolean) => {
      if (!round || submittedRef.current) {
        return;
      }

      submittedRef.current = true;

      if (isCorrect) {
        setCorrectCount((count) => count + 1);
      }

      if (questionIndex === round.length - 1) {
        const finalScore = correctCount + (isCorrect ? 1 : 0);
        const entry = { name: playerName, score: finalScore, playedAt: Date.now() };
        const updated = [...leaderboard, entry]
          .sort((a, b) => b.score - a.score || b.playedAt - a.playedAt)
          .slice(0, 10);
        setLeaderboard(updated);
        try {
          window.localStorage.setItem(leaderboardKey, JSON.stringify(updated));
        } catch {
          // Keep the result visible for this session if storage is unavailable.
        }
        setIsComplete(true);
        return;
      }

      setTimeLeft(secondsPerQuestion);
      setQuestionIndex((index) => index + 1);
    },
    [correctCount, leaderboard, playerName, questionIndex, round],
  );

  useEffect(() => {
    if (isComplete || !round) {
      return;
    }

    submittedRef.current = false;

    const deadline = Date.now() + secondsPerQuestion * 1000;
    const timer = window.setInterval(() => {
      const secondsRemaining = Math.max(
        0,
        Math.ceil((deadline - Date.now()) / 1000),
      );
      setTimeLeft(secondsRemaining);

      if (secondsRemaining === 0) {
        window.clearInterval(timer);
        submitAnswer(false);
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [isComplete, questionIndex, round, submitAnswer]);

  function selectAnswer(option: string) {
    if (question) {
      submitAnswer(option === question.answer);
    }
  }

  function restartQuiz() {
    submittedRef.current = true;
    setRound(null);
    setIsComplete(false);
    setNameInput(playerName);
  }

  return (
    <main className="quiz-page">
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Brightside Quiz home">
          <span className="brand-mark" aria-hidden="true">
            q
          </span>
          <span>brightside</span>
        </Link>
        <span className="header-note">
          <span className="status-dot" aria-hidden="true" />
          A little brain break
        </span>
      </header>

      <section className="quiz-shell" aria-labelledby="page-title">
        <div className="intro">
          <span className="eyebrow">
            <span aria-hidden="true">✦</span> YOUR DAILY QUIZ
          </span>
          <h1 id="page-title">
            Good things come
            <br />
            to curious minds.
          </h1>
          
        </div>

        <div className="quiz-card">
          {!round && !isComplete ? (
            <div className="start-screen">
              <span className="result-icon" aria-hidden="true">✦</span>
              <p className="question-kicker">READY TO PLAY?</p>
              <h2 className="result-title">What should we call you?</h2>
              <p className="result-description">Your name will appear beside your score.</p>
              <form className="name-form" onSubmit={startGame}>
                <label className="name-label" htmlFor="player-name">Your name</label>
                <input
                  autoComplete="name"
                  className="name-input"
                  id="player-name"
                  maxLength={24}
                  onChange={(event) => setNameInput(event.target.value)}
                  placeholder="Enter your name"
                  required
                  value={nameInput}
                />
                <button className="restart-button" type="submit">Start the quiz</button>
              </form>
            </div>
          ) : !isComplete && round && question ? (
            <>
              <div className="card-topline">
                <span className="category-label">
                  <span className="category-icon" aria-hidden="true">
                    ✳
                  </span>
                  General knowledge
                </span>
                <div className="question-status">
                  <span className="question-count">
                    <strong>{questionIndex + 1}</strong>
                    <span className="count-divider">/</span>
                    {questionsPerRound}
                  </span>
                  <span
                    className={`timer-badge${timeLeft <= 5 ? " timer-urgent" : ""}`}
                    role="timer"
                    aria-label={`${timeLeft} seconds remaining`}
                  >
                    <span className="timer-icon" aria-hidden="true">
                      ◷
                    </span>
                    {timeLeft}s
                  </span>
                </div>
              </div>

              <div
                className="progress-track"
                role="progressbar"
                aria-label="Quiz progress"
                aria-valuemin={0}
                aria-valuemax={questionsPerRound}
                aria-valuenow={questionIndex + 1}
              >
                <span
                  className="progress-fill"
                  style={{
                    width: `${((questionIndex + 1) / questionsPerRound) * 100}%`,
                  }}
                />
              </div>

              <div
                className={`timer-track${timeLeft <= 5 ? " timer-track-urgent" : ""}`}
                aria-hidden="true"
              >
                <span
                  className="timer-fill"
                  style={{ width: `${(timeLeft / secondsPerQuestion) * 100}%` }}
                />
              </div>

              <p className="question-kicker">
                QUESTION {String(questionIndex + 1).padStart(2, "0")}
              </p>
              <h2
                className="question-title"
                key={questionIndex}
                aria-live="polite"
              >
                {question.question}
              </h2>
              <p className="answer-hint">
                Choose the best answer before the timer runs out
              </p>

              <div className="options-list">
                {question.options.map((option, index) => (
                  <button
                    className="option-button"
                    key={option}
                    onClick={() => selectAnswer(option)}
                    type="button"
                  >
                    <span className="option-letter">{optionLetters[index]}</span>
                    <span className="option-text">{option}</span>
                    <span className="option-arrow" aria-hidden="true">
                      →
                    </span>
                  </button>
                ))}
              </div>

              <div className="card-footer">
                <span>
                  <span className="sparkle" aria-hidden="true">
                    ✦
                  </span>{" "}
                  No pressure, just for fun
                </span>
                <span>{questionsPerRound - questionIndex} to go</span>
              </div>
            </>
          ) : isComplete ? (
            <div className="results">
              <span className="result-icon" aria-hidden="true">
                {correctCount >= 7 ? "✦" : "✓"}
              </span>
              <p className="question-kicker">QUIZ COMPLETE</p>
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
                <strong>{playerName}</strong>, you got <strong>{correctCount}</strong> out of {questionsPerRound} questions right.
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

              <button
                className="restart-button"
                onClick={restartQuiz}
                type="button"
              >
                <span aria-hidden="true">↻</span> Give it another go
              </button>
              <p className="result-footnote">Thanks for playing. Stay curious!</p>
            </div>
          ) : (
            <div className="quiz-loading" role="status">
              Preparing your questions...
            </div>
          )}
        </div>

        <p className="page-footnote">
          MADE FOR YOUR MOMENT OF CURIOSITY <span aria-hidden="true">✦</span>
        </p>
      </section>
    </main>
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
            <li key={`${entry.playedAt}-${index}`}>
              <span className="leaderboard-rank">{index + 1}</span>
              <span className="leaderboard-name">{entry.name}</span>
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
