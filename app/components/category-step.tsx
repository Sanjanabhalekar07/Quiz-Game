"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "../quiz-context";
import { categoryClass, type QuizCategory } from "../quiz-data";

export function CategoryStep() {
  const router = useRouter();
  const { hydrated, playerName, selectCategory } = useQuiz();
  const [categories, setCategories] = useState<QuizCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [choosing, setChoosing] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (hydrated && !playerName) router.replace("/");
  }, [hydrated, playerName, router]);

  useEffect(() => {
    if (!hydrated || !playerName) return;
    let active = true;
    void fetch("/api/quiz/categories")
      .then(async (response) => {
        const data = (await response.json()) as { categories?: QuizCategory[]; error?: string };
        if (!response.ok) throw new Error(data.error || "Could not load categories.");
        if (active) setCategories(data.categories ?? []);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load categories.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [hydrated, playerName]);

  async function chooseCategory(categoryId: string, categoryName: string) {
    setChoosing(true);
    setError("");
    const selectionError = await selectCategory(categoryId, categoryName);
    if (!selectionError) {
      router.push("/quiz");
    } else {
      setError(selectionError);
      setChoosing(false);
    }
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
      {loading ? <p role="status">Loading categories…</p> : null}
      {error ? <p role="alert">{error}</p> : null}
      {!loading && !error && !categories.length ? <p>No categories are available.</p> : null}
      <div className="category-grid">
        {categories.map((category) => (
          <button
            className={`category-option ${categoryClass(category.name)}`}
            key={category._id}
            disabled={choosing}
            onClick={() => void chooseCategory(category._id, category.name)}
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
