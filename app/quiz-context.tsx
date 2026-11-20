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
import type { QuizQuestion } from "./questions";
import {
  createRound,
  gameSessionKey,
  isQuizQuestion,
  isScoreEntry,
  leaderboardKey,
  playerNameKey,
  playerEmailKey,
  type ScoreEntry,
} from "./quiz-data";

type QuizState = {
  hydrated: boolean;
  playerName: string;
  playerEmail: string;
  selectedCategory: string | null;
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
  round: [],
  questionIndex: 0,
  correctCount: 0,
  isComplete: false,
  hasSubmitted: false,
  leaderboard: [],
};

let cachedState: QuizState | null = null;
const listeners = new Set<() => void>();

function readState(): QuizState {
  if (typeof window === "undefined") return initialState;

  try {
    const playerName = window.localStorage.getItem(playerNameKey) ?? "";
    const playerEmail = window.localStorage.getItem(playerEmailKey) ?? "";
    const savedScores = JSON.parse(
      window.localStorage.getItem(leaderboardKey) ?? "[]",
    ) as unknown;
    const savedSession = JSON.parse(
      window.sessionStorage.getItem(gameSessionKey) ?? "{}",
    ) as Partial<QuizState>;
    const round = Array.isArray(savedSession.round)
      ? savedSession.round.filter(isQuizQuestion)
      : [];
    const leaderboard = Array.isArray(savedScores)
      ? savedScores
          .filter(isScoreEntry)
          .sort((a, b) => b.score - a.score || b.playedAt - a.playedAt)
          .slice(0, 10)
      : [];

    return {
      ...initialState,
      hydrated: true,
      playerName,
      playerEmail,
      leaderboard,
      selectedCategory:
        typeof savedSession.selectedCategory === "string"
          ? savedSession.selectedCategory
          : null,
      round,
      questionIndex:
        typeof savedSession.questionIndex === "number"
          ? Math.min(Math.max(0, savedSession.questionIndex), Math.max(0, round.length - 1))
          : 0,
      correctCount:
        typeof savedSession.correctCount === "number"
          ? Math.max(0, savedSession.correctCount)
          : 0,
      isComplete: Boolean(savedSession.isComplete),
      hasSubmitted: Boolean(savedSession.hasSubmitted),
    };
  } catch {
    return { ...initialState, hydrated: true };
  }
}

function getSnapshot() {
  if (!cachedState) cachedState = readState();
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

  function handleStorage(event: StorageEvent) {
    if (
      event.key === null ||
      event.key === playerNameKey ||
      event.key === playerEmailKey ||
      event.key === leaderboardKey ||
      event.key === gameSessionKey
    ) {
      cachedState = null;
      notifyListeners();
    }
  }

  window.addEventListener("storage", handleStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", handleStorage);
  };
}

function updateState(updater: (current: QuizState) => QuizState) {
  const nextState = updater(getSnapshot());
  cachedState = nextState;

  try {
    window.localStorage.setItem(playerNameKey, nextState.playerName);
    window.localStorage.setItem(playerEmailKey, nextState.playerEmail);
    window.localStorage.setItem(
      leaderboardKey,
      JSON.stringify(nextState.leaderboard),
    );
    window.sessionStorage.setItem(
      gameSessionKey,
      JSON.stringify({
        selectedCategory: nextState.selectedCategory,
        round: nextState.round,
        questionIndex: nextState.questionIndex,
        correctCount: nextState.correctCount,
        isComplete: nextState.isComplete,
        hasSubmitted: nextState.hasSubmitted,
      }),
    );
  } catch {
    // The quiz still works for the current visit when browser storage is unavailable.
  }

  notifyListeners();
}

type QuizContextValue = QuizState & {
  setPlayerName: (name: string, email: string) => void;
  updatePlayerIdentity: (name: string, email: string) => void;
  selectCategory: (category: string) => void;
  submitAnswer: (isCorrect: boolean, expectedQuestionIndex: number) => Promise<boolean>;
  replayCategory: () => void;
  chooseAnotherCategory: () => void;
  startNextGame: () => void;
};

const QuizContext = createContext<QuizContextValue | null>(null);

export function QuizProvider({ children }: { children: ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
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
        // Keep the locally saved leaderboard available when the database is offline.
      });
  }, []);

  const setPlayerName = useCallback((name: string, email: string) => {
    updateState((current) => ({
      ...current,
      playerName: name,
      playerEmail: email,
      selectedCategory: null,
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

  const selectCategory = useCallback((category: string) => {
    updateState((current) => ({
      ...current,
      selectedCategory: category,
      round: createRound(category),
      questionIndex: 0,
      correctCount: 0,
      isComplete: false,
      hasSubmitted: false,
    }));
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
      name: current.playerName,
      email: current.playerEmail,
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
      // The completed round remains saved locally if MongoDB is unavailable.
    }
    return true;
  }, []);

  const replayCategory = useCallback(() => {
    const current = getSnapshot();
    const category = current.selectedCategory ?? current.round[0]?.category;
    if (!category) return;
    updateState((latest) => ({
      ...latest,
      selectedCategory: category,
      round: createRound(category),
      questionIndex: 0,
      correctCount: 0,
      isComplete: false,
      hasSubmitted: false,
    }));
  }, []);

  const chooseAnotherCategory = useCallback(() => {
    updateState((current) => ({
      ...current,
      selectedCategory: null,
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

