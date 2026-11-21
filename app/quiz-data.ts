export const questionsPerRound = 10;
export const secondsPerQuestion = 15;
export const optionLetters = ["A", "B", "C", "D"];

export type QuizQuestion = {
  question: string;
  category: string;
  options: string[];
  answer: string;
};

export type QuizCategory = {
  _id: string;
  name: string;
  icon: string;
  description: string;
};

export type ScoreEntry = {
  name?: string;
  email?: string;
  user_id?: string;
  score: number;
  category?: string;
  playedAt: number;
};

export function categoryClass(category?: string) {
  return `category-theme-${(category ?? "General Knowledge")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")}`;
}

export function isQuizQuestion(value: unknown): value is QuizQuestion {
  if (!value || typeof value !== "object") return false;
  const question = value as Partial<QuizQuestion>;
  return (
    typeof question.question === "string" &&
    typeof question.category === "string" &&
    Array.isArray(question.options) &&
    question.options.every((option) => typeof option === "string") &&
    typeof question.answer === "string"
  );
}

export function isScoreEntry(value: unknown): value is ScoreEntry {
  if (!value || typeof value !== "object") return false;
  const score = value as Partial<ScoreEntry>;
  return (
    (score.name === undefined || typeof score.name === "string") &&
    (score.email === undefined || typeof score.email === "string") &&
    Number.isFinite(score.score) &&
    Number.isFinite(score.playedAt)
  );
}
