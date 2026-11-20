"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { categoryClass } from "../quiz-data";
import { useQuiz } from "../quiz-context";

export function QuizFrame({
  children,
  title,
  description,
}: {
  children: ReactNode;
  title: ReactNode;
  description: string;
}) {
  const router = useRouter();
  const game = useQuiz();
  const activeCategory = game.selectedCategory ?? game.round[0]?.category;

  async function logOut() {
    await fetch("/api/auth/sign-out", { method: "POST" }).catch(() => undefined);
    game.startNextGame();
    router.push("/");
  }

  return (
    <main className={`quiz-page ${categoryClass(activeCategory)}`}>
      <header className="site-header">
        <Link className="brand" href="/" aria-label="Brightside Quiz home">
          <span className="brand-mark" aria-hidden="true">q</span>
          <span>brightside</span>
        </Link>
        <span className="header-note">
          {game.playerName ? (
            <>
              <span className="account-copy">
                <strong className="account-name">{game.playerName}</strong>
              </span>
              <Link className="profile-button" href="/profile">Profile</Link>
              <button className="logout-button" type="button" onClick={logOut}>Log Out</button>
            </>
          ) : (
            <>
              <span className="status-dot" aria-hidden="true" />
              A little brain break
            </>
          )}
        </span>
      </header>

      <section className="quiz-shell" aria-labelledby="page-title">
        <div className="intro">
          <span className="eyebrow">
            <span aria-hidden="true">✦</span> YOUR DAILY QUIZ
          </span>
          <h1 id="page-title">{title}</h1>
          <p>{description}</p>
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
