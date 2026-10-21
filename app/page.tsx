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
const categories = [
  { name: "Science", icon: "⚛", description: "Discover how the world works" },
  { name: "Geography", icon: "⌖", description: "Explore places near and far" },
  { name: "Math & Logic", icon: "＋", description: "Put your reasoning to work" },
  { name: "Nature", icon: "❋", description: "Meet the natural world" },
  { name: "Arts & Culture", icon: "✦", description: "Celebrate creativity and culture" },
  { name: "Sports", icon: "◎", description: "Take your best shot" },
] as const;

type ScoreEntry = { name: string; score: number; category?: string; playedAt: number };

function categoryClass(category?: string) {
  return `category-theme-${(category ?? "General Knowledge")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

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

function createRound(category: string): QuizQuestion[] {
  return shuffle(questionBank.filter((question) => question.category === category))
    .slice(0, questionsPerRound)
    .map((question) => ({
      ...question,
      options: shuffle(question.options),
    }));
}

export default function Home() {
  const [round, setRound] = useState<QuizQuestion[] | null>(null);
  const [playerName, setPlayerName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [leaderboard, setLeaderboard] = useState<ScoreEntry[]>([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);
  const submittedRef = useRef(false);

  const question = round?.[questionIndex];
  const incorrectCount = (round?.length ?? questionsPerRound) - correctCount;
  const resultCategory = round
    ? round.reduce((counts, item) => {
        counts[item.category] = (counts[item.category] ?? 0) + 1;
        return counts;
      }, {} as Record<string, number>)
    : {};
  const leadingCategory = Object.entries(resultCategory).sort(
    ([categoryA, countA], [categoryB, countB]) =>
      countB - countA || categoryA.localeCompare(categoryB),
  )[0]?.[0] ?? "General Knowledge";

  useEffect(() => {
    try {
      const savedName = window.localStorage.getItem(playerNameKey) ?? "";
      const savedScores = JSON.parse(
        window.localStorage.getItem(leaderboardKey) ?? "[]",
      ) as ScoreEntry[];
      // Keep the saved name as a convenient input value, but require the
      // username step to be submitted before showing category selection.
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
    setSelectedCategory(null);
    setRound(null);
    setQuestionIndex(0);
    setCorrectCount(0);
    setTimeLeft(secondsPerQuestion);
    setIsComplete(false);
  }

  function chooseCategory(category: string) {
    setSelectedCategory(category);
    setRound(createRound(category));
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
        const entry = {
          name: playerName,
          score: finalScore,
          category: leadingCategory,
          playedAt: Date.now(),
        };
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
    [correctCount, leadingCategory, leaderboard, playerName, questionIndex, round],
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

  function replayCategory() {
    submittedRef.current = true;
    const category = selectedCategory ?? leadingCategory;
    setSelectedCategory(category);
    setRound(createRound(category));
    setQuestionIndex(0);
    setCorrectCount(0);
    setTimeLeft(secondsPerQuestion);
    setIsComplete(false);
  }

  function chooseAnotherCategory() {
    submittedRef.current = true;
    setRound(null);
    setSelectedCategory(null);
    setIsComplete(false);
    setNameInput(playerName);
  }

  function startNextGame() {
    submittedRef.current = true;
    setRound(null);
    setSelectedCategory(null);
    setPlayerName("");
    setNameInput("");
    setIsComplete(false);
    setQuestionIndex(0);
    setCorrectCount(0);
    try {
      window.localStorage.removeItem(playerNameKey);
    } catch {
      // The next game can still start when browser storage is unavailable.
    }
  }

  const activeCategory = selectedCategory ?? (isComplete ? leadingCategory : question?.category);

  return (
    <main className={`quiz-page ${categoryClass(activeCategory)}`}>
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

        <div className={`quiz-card ${categoryClass(activeCategory)}`}>
          {!round && !isComplete && !playerName ? (
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
          ) : !selectedCategory && playerName && !round && !isComplete ? (
            <div className="category-screen">
              <span className="result-icon" aria-hidden="true">✦</span>
              <p className="question-kicker">PICK YOUR PLAYGROUND</p>
              <h2 className="result-title">What are you curious about?</h2>
              <p className="result-description">Choose a category to start your 10-question round.</p>
              <div className="category-grid">
                {categories.map((category) => (
                  <button
                    className={`category-option ${categoryClass(category.name)}`}
                    key={category.name}
                    onClick={() => chooseCategory(category.name)}
                    type="button"
                  >
                    <span className="category-option-icon" aria-hidden="true">{category.icon}</span>
                    <span className="category-option-name">{category.name}</span>
                    <span className="category-option-description">{category.description}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : !isComplete && round && question ? (
            <>
              <div className="card-topline">
                <span className="category-label">
                  <span className="category-icon" aria-hidden="true">
                    ✳
                  </span>
                  {selectedCategory}
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
              <p className="result-category">
                Round theme: <span className={categoryClass(selectedCategory ?? leadingCategory)}>{selectedCategory ?? leadingCategory}</span>
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

              <Leaderboard scores={leaderboard} category={selectedCategory ?? leadingCategory} />

              <div className="result-actions">
                <button className="restart-button" onClick={replayCategory} type="button">
                  <span aria-hidden="true">↻</span> Give it another go
                </button>
                <button className="restart-button secondary-action choose-category-action" onClick={chooseAnotherCategory} type="button">
                  <svg className="action-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <rect x="2" y="2" width="5" height="5" rx="1" />
                    <rect x="9" y="2" width="5" height="5" rx="1" />
                    <rect x="2" y="9" width="5" height="5" rx="1" />
                    <rect x="9" y="9" width="5" height="5" rx="1" />
                  </svg>
                  Choose Category
                </button>
                <button className="restart-button secondary-action change-username-action" onClick={startNextGame} type="button">
                  <svg className="action-icon" width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                    <circle cx="8" cy="5" r="3" />
                    <path d="M2.5 14c.4-2.8 2.5-4.5 5.5-4.5s5.1 1.7 5.5 4.5" />
                  </svg>
                  Change Username
                </button>
              </div>
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

function Leaderboard({ scores, category }: { scores: ScoreEntry[]; category: string }) {
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
              <span className="leaderboard-name">{entry.name}</span>
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
