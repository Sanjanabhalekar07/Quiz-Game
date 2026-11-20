"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "../quiz-context";
import {
  optionLetters,
  questionsPerRound,
  secondsPerQuestion,
} from "../quiz-data";

export function QuizStep() {
  const router = useRouter();
  const { hydrated, playerName, round, questionIndex, correctCount, isComplete, submitAnswer } = useQuiz();
  const question = round[questionIndex];

  const expireQuestion = useCallback(async () => {
    if (await submitAnswer(false, questionIndex)) router.push("/results");
  }, [questionIndex, router, submitAnswer]);

  useEffect(() => {
    if (hydrated && !playerName) router.replace("/");
    else if (hydrated && !round.length) router.replace("/categories");
    else if (hydrated && isComplete) router.replace("/results");
  }, [hydrated, isComplete, playerName, round.length, router]);

  async function selectAnswer(option: string) {
    if (question && await submitAnswer(option === question.answer, questionIndex)) {
      router.push("/results");
    }
  }

  if (!hydrated || !playerName || !question || isComplete) {
    return <div className="quiz-loading" role="status">Preparing your questions…</div>;
  }

  return (
    <>
      <div className="card-topline">
        <span className="category-label">
          <span className="category-icon" aria-hidden="true">✳</span>
          {question.category}
        </span>
        <div className="question-status">
          <span className="question-count">
            <strong>{questionIndex + 1}</strong>
            <span className="count-divider">/</span>
            {questionsPerRound}
          </span>
          <QuestionTimer key={questionIndex} onExpire={expireQuestion} />
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
          style={{ width: `${((questionIndex + 1) / questionsPerRound) * 100}%` }}
        />
      </div>

      <p className="question-kicker">STEP 3 · QUESTION {String(questionIndex + 1).padStart(2, "0")}</p>
      <h2 className="question-title" key={questionIndex} aria-live="polite">
        {question.question}
      </h2>
      <p className="answer-hint">Choose the best answer before the timer runs out</p>

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
            <span className="option-arrow" aria-hidden="true">→</span>
          </button>
        ))}
      </div>

      <div className="card-footer">
        <span><span className="sparkle" aria-hidden="true">✦</span> No pressure, just for fun</span>
        <span>{questionsPerRound - questionIndex} to go · {correctCount} correct</span>
      </div>
    </>
  );
}

function QuestionTimer({ onExpire }: { onExpire: () => void }) {
  const [timeLeft, setTimeLeft] = useState(secondsPerQuestion);

  useEffect(() => {
    const deadline = Date.now() + secondsPerQuestion * 1000;
    let expired = false;
    const timer = window.setInterval(() => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTimeLeft(remaining);

      if (remaining === 0 && !expired) {
        expired = true;
        window.clearInterval(timer);
        onExpire();
      }
    }, 200);

    return () => window.clearInterval(timer);
  }, [onExpire]);

  return (
    <>
      <span className="question-timer">
        <span
          className={`timer-badge${timeLeft <= 5 ? " timer-urgent" : ""}`}
          role="timer"
          aria-label={`${timeLeft} seconds remaining`}
        >
          <span className="timer-icon" aria-hidden="true">◷</span>
          {timeLeft}s
        </span>
        <span
          className={`timer-track${timeLeft <= 5 ? " timer-track-urgent" : ""}`}
          aria-hidden="true"
        >
          <span className="timer-fill" style={{ width: `${(timeLeft / secondsPerQuestion) * 100}%` }} />
        </span>
      </span>
    </>
  );
}
