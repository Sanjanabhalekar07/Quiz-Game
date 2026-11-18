"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { categoryClass } from "../quiz-data";
import { useQuiz } from "../quiz-context";

const pageNames = ["Your name", "Category", "Quiz", "Results"];

export function QuizFrame({
  children,
  step,
  title,
  description,
}: {
  children: ReactNode;
  step: number;
  title: ReactNode;
  description: string;
}) {
  const game = useQuiz();
  const activeCategory = game.selectedCategory ?? game.round[0]?.category;

  return (
    <main className={`quiz-page ${categoryClass(activeCategory)}`}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Brightside Quiz home">
          <span className="brand-mark" aria-hidden="true">q</span>
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
          <h1 id="page-title">{title}</h1>
          <p>{description}</p>
          <ol className="quiz-stepper" aria-label="Quiz steps">
            {pageNames.map((name, index) => (
              <li
                aria-current={index + 1 === step ? "step" : undefined}
                className={index + 1 <= step ? "step-active" : undefined}
                key={name}
              >
                <span>{index + 1}</span>
                {name}
              </li>
            ))}
          </ol>
        </div>

        <div className={`quiz-card ${categoryClass(activeCategory)}`}>
          {children}
        </div>

        <p className="page-footnote">
          MADE FOR YOUR MOMENT OF CURIOSITY <span aria-hidden="true">✦</span>
        </p>
      </section>
    </main>
  );
}
