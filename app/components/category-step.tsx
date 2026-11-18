"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "../quiz-context";
import { categories, categoryClass } from "../quiz-data";

export function CategoryStep() {
  const router = useRouter();
  const { hydrated, playerName, selectCategory } = useQuiz();

  useEffect(() => {
    if (hydrated && !playerName) router.replace("/");
  }, [hydrated, playerName, router]);

  function chooseCategory(category: string) {
    selectCategory(category);
    router.push("/quiz");
  }

  if (!hydrated || !playerName) {
    return <div className="quiz-loading" role="status">Returning to the start…</div>;
  }

  return (
    <div className="category-screen">
      <span className="result-icon" aria-hidden="true">✦</span>
      <p className="question-kicker">STEP 2 · PICK YOUR PLAYGROUND</p>
      <h2 className="result-title">What are you curious about?</h2>
      <p className="result-description">
        Choose a category to start your 10-question round.
      </p>
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
  );
}
