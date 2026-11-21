"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { QuizQuestion } from "./quiz-data";
import {
  isQuizQuestion,
  isScoreEntry,
  type ScoreEntry,
} from "./quiz-data";

type QuizState = {
  hydrated: boolean;
  playerName: string;
  playerEmail: string;
  selectedCategory: string | null;
  selectedCategoryId: string | null;
  round: QuizQuestion[];
  questionIndex: number;
  correctCount: number;
  isComplete: boolean;
  hasSubmitted: boolean;
  leaderboard: ScoreEntry[];
};

const initialState: QuizState = {
  hydrated: false,
  playerName: "",
  playerEmail: "",
  selectedCategory: null,
  selectedCategoryId: null,
  round: [],
  questionIndex: 0,
  correctCount: 0,
  isComplete: false,
  hasSubmitted: false,
  leaderboard: [],
};

let cachedState: QuizState = initialState;
const listeners = new Set<() => void>();

function getSnapshot() {
  return cachedState;
}

function getServerSnapshot() {
  return initialState;
}

function notifyListeners() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function updateState(updater: (current: QuizState) => QuizState) {
  const nextState = updater(getSnapshot());
  cachedState = nextState;
  notifyListeners();
}

type QuizContextValue = QuizState & {
  setPlayerName: (name: string, email: string) => void;
  updatePlayerIdentity: (name: string, email: string) => void;
  selectCategory: (categoryId: string, categoryName: string) => Promise<string | null>;
  submitAnswer: (isCorrect: boolean, expectedQuestionIndex: number) => Promise<boolean>;
  replayCategory: () => Promise<string | null>;
  chooseAnotherCategory: () => void;
  startNextGame: () => void;
};

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then(async (response) => {
        if (!response.ok) throw new Error("Could not verify session.");
        const data = (await response.json()) as { user?: { name: string; email: string } | null };
        updateState((current) => ({
          ...current,
          hydrated: true,
          playerName: data.user?.name ?? "",
          playerEmail: data.user?.email ?? "",
        }));
      })
      .catch(() => {
        updateState((current) => ({ ...current, hydrated: true }));
      });

    void fetch("/api/scores")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { scores?: unknown } | null) => {
        if (!data || !Array.isArray(data.scores)) return;
        const leaderboard = data.scores
          .filter(isScoreEntry)
          .sort((a, b) => b.score - a.score || b.playedAt - a.playedAt)
          .slice(0, 10);
        updateState((current) => ({ ...current, leaderboard }));
      })
      .catch(() => {
        // Leave the leaderboard empty when the database is unavailable.
      });
  }, []);

  const setPlayerName = useCallback((name: string, email: string) => {
    updateState((current) => ({
      ...current,
      playerName: name,
      playerEmail: email,
      selectedCategory: null,
      selectedCategoryId: null,
      round: [],
      questionIndex: 0,
      correctCount: 0,
      isComplete: false,
      hasSubmitted: false,
    }));
  }, []);

  const updatePlayerIdentity = useCallback((name: string, email: string) => {
    updateState((current) => ({
      ...current,
      playerName: name,
      playerEmail: email,
    }));
  }, []);

  const selectCategory = useCallback(async (categoryId: string, categoryName: string): Promise<string | null> => {
    try {
      const response = await fetch(`/api/quiz/questions?categoryId=${encodeURIComponent(categoryId)}`, { cache: "no-store" });
      const data = await response.json() as { questions?: unknown; error?: string };
      if (!response.ok) return data.error ?? "Could not load questions for this category.";
      if (!Array.isArray(data.questions) || !data.questions.every(isQuizQuestion)) {
        return "The questions for this category could not be read. Please contact the quiz administrator.";
      }
      updateState((current) => ({
        ...current,
        selectedCategory: categoryName,
        selectedCategoryId: categoryId,
        round: data.questions as QuizQuestion[],
        questionIndex: 0,
        correctCount: 0,
        isComplete: false,
        hasSubmitted: false,
      }));
      return null;
    } catch (error) {
      return error instanceof Error
        ? `Could not reach the question service: ${error.message}`
        : "Could not reach the question service. Please try again.";
    }
  }, []);

  const submitAnswer = useCallback(async (isCorrect: boolean, expectedQuestionIndex: number) => {
    const current = getSnapshot();
    if (
      !current.round.length ||
      current.isComplete ||
      current.hasSubmitted ||
      current.questionIndex !== expectedQuestionIndex
    ) {
      return false;
    }

    const correctCount = current.correctCount + (isCorrect ? 1 : 0);
    const isLastQuestion = current.questionIndex >= current.round.length - 1;

    if (!isLastQuestion) {
      updateState((latest) => ({
        ...latest,
        questionIndex: latest.questionIndex + 1,
        correctCount,
        hasSubmitted: false,
      }));
      return false;
    }

    const category = current.selectedCategory ?? current.round[0].category;
    const entry: ScoreEntry = {
      score: correctCount,
      category,
      playedAt: Date.now(),
    };
    const leaderboard = [...current.leaderboard, entry]
      .sort((a, b) => b.score - a.score || b.playedAt - a.playedAt)
      .slice(0, 10);

    updateState((latest) => ({
      ...latest,
      correctCount,
      leaderboard,
      isComplete: true,
      hasSubmitted: true,
    }));
    try {
      const response = await fetch("/api/scores", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
      });
      const data = response.ok
        ? (await response.json()) as { scores?: unknown }
        : null;
      if (data && Array.isArray(data.scores)) {
        const scores = data.scores
          .filter(isScoreEntry)
          .sort((a, b) => b.score - a.score || b.playedAt - a.playedAt)
          .slice(0, 10);
        updateState((latest) => ({ ...latest, leaderboard: scores }));
      }
    } catch {
      // Keep the results available in memory for this page visit.
    }
    return true;
  }, []);

  const replayCategory = useCallback(async () => {
    const current = getSnapshot();
    const categoryId = current.selectedCategoryId;
    const categoryName = current.selectedCategory ?? current.round[0]?.category;
    if (!categoryId || !categoryName) return "Choose a category first.";
    return selectCategory(categoryId, categoryName);
  }, [selectCategory]);

  const chooseAnotherCategory = useCallback(() => {
    updateState((current) => ({
      ...current,
      selectedCategory: null,
      selectedCategoryId: null,
      round: [],
      questionIndex: 0,
      correctCount: 0,
      isComplete: false,
      hasSubmitted: false,
    }));
  }, []);

  const startNextGame = useCallback(() => {
    updateState((current) => ({
      ...initialState,
      hydrated: true,
      leaderboard: current.leaderboard,
    }));
  }, []);

  const value = useMemo(
    () => ({
      ...state,
      setPlayerName,
      updatePlayerIdentity,
      selectCategory,
      submitAnswer,
      replayCategory,
      chooseAnotherCategory,
      startNextGame,
    }),
    [
      state,
      setPlayerName,
      updatePlayerIdentity,
      selectCategory,
      submitAnswer,
      replayCategory,
      chooseAnotherCategory,
      startNextGame,
    ],
  );

  return <QuizContext.Provider value={value}>{children}</QuizContext.Provider>;
}

export function useQuiz() {
  const context = useContext(QuizContext);
  if (!context) throw new Error("useQuiz must be used inside QuizProvider");
  return context;
}

