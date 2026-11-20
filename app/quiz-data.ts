import { questionBank, type QuizQuestion } from "./questions";

export const questionsPerRound = 10;
export const secondsPerQuestion = 15;
export const optionLetters = ["A", "B", "C", "D"];
export const leaderboardKey = "brightside-quiz-leaderboard";
export const playerNameKey = "brightside-quiz-player-name";
export const playerEmailKey = "brightside-quiz-player-email";
export const gameSessionKey = "brightside-quiz-session";

export const categories = [
  { name: "Science", icon: "⚛", description: "Discover how the world works" },
  { name: "Geography", icon: "⌖", description: "Explore places near and far" },
  { name: "Math & Logic", icon: "＋", description: "Put your reasoning to work" },
  { name: "Nature", icon: "❋", description: "Meet the natural world" },
  { name: "Arts & Culture", icon: "✦", description: "Celebrate creativity and culture" },
  { name: "Sports", icon: "◎", description: "Take your best shot" },
] as const;

export type ScoreEntry = {
  name: string;
  email?: string;
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

export function createRound(category: string): QuizQuestion[] {
  return shuffle(questionBank.filter((question) => question.category === category))
    .slice(0, questionsPerRound)
    .map((question) => ({
      ...question,
      options: shuffle(question.options),
    }));
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
    typeof score.name === "string" &&
    (score.email === undefined || typeof score.email === "string") &&
    Number.isFinite(score.score) &&
    Number.isFinite(score.playedAt)
  );
}
