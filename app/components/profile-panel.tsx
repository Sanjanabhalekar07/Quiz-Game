"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useQuiz } from "../quiz-context";
import { isScoreEntry, questionsPerRound, type ScoreEntry } from "../quiz-data";

type Profile = { name: string; email: string };

export function ProfilePanel() {
  const router = useRouter();
  const { hydrated, playerName, playerEmail, updatePlayerIdentity } = useQuiz();
  const [profile, setProfile] = useState<Profile>({ name: playerName, email: playerEmail });
  const [games, setGames] = useState<ScoreEntry[]>([]);
  const [highScoreGame, setHighScoreGame] = useState<ScoreEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!hydrated) return;
    if (!playerName) {
      router.replace("/");
      return;
    }

    let active = true;
    void fetch("/api/auth/profile")
      .then(async (response) => {
        const data = (await response.json()) as {
          profile?: Profile;
          games?: unknown;
          highScoreGame?: unknown;
          error?: string;
        };
        if (!response.ok) throw new Error(data.error ?? "Could not load your profile.");
        if (!active) return;
        if (data.profile) setProfile(data.profile);
        setGames(Array.isArray(data.games) ? data.games.filter(isScoreEntry) : []);
        setHighScoreGame(isScoreEntry(data.highScoreGame) ? data.highScoreGame : null);
      })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load your profile.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [hydrated, playerName, router]);

  async function updateProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setSaving(true);
    setMessage("");
    setError("");
    const formData = new FormData(event.currentTarget);

    try {
      const response = await fetch("/api/auth/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          email: formData.get("email"),
          currentPassword: formData.get("currentPassword"),
          newPassword: formData.get("newPassword"),
        }),
      });
      const data = (await response.json()) as { profile?: Profile; error?: string };
      if (!response.ok || !data.profile) throw new Error(data.error ?? "Could not update your profile.");

      setProfile(data.profile);
      updatePlayerIdentity(data.profile.name, data.profile.email);
      setMessage("Profile updated.");
      form.reset();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update your profile.");
    } finally {
      setSaving(false);
    }
  }

  if (!hydrated || !playerName || loading) {
    return <div className="quiz-loading" role="status">Loading your profile…</div>;
  }

  return (
    <div className="profile-panel">
      <section className="profile-section" aria-labelledby="profile-edit-title">
        <h2 id="profile-edit-title">Account details</h2>
        <form className="name-form profile-form" onSubmit={updateProfile}>
          <label className="name-label" htmlFor="profile-name">Name</label>
          <input className="name-input" id="profile-name" name="name" autoComplete="name" maxLength={40} value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} required />
          <label className="name-label" htmlFor="profile-email">Email</label>
          <input className="name-input" id="profile-email" name="email" type="email" autoComplete="email" maxLength={254} value={profile.email} onChange={(event) => setProfile({ ...profile, email: event.target.value })} required />
          <label className="name-label" htmlFor="current-password">Current password</label>
          <input className="name-input" id="current-password" name="currentPassword" type="password" autoComplete="current-password" minLength={8} maxLength={128} placeholder="Required to save changes" required />
          <label className="name-label" htmlFor="new-password">New password <span>(optional)</span></label>
          <input className="name-input" id="new-password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={128} placeholder="Leave blank to keep current password" />
          <button className="restart-button" type="submit" disabled={saving}>{saving ? "Saving…" : "Save profile"}</button>
          {message && <p className="profile-message" role="status">{message}</p>}
          {error && <p className="profile-error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="profile-section" aria-labelledby="high-score-title">
        <div className="profile-section-heading">
          <h2 id="high-score-title">High score</h2>
          {highScoreGame ? <strong>{highScoreGame.score}/{questionsPerRound}</strong> : <span>No games yet</span>}
        </div>
        {highScoreGame && (
          <p className="profile-high-score-meta">
            {highScoreGame.category ?? "General Knowledge"} · {formatDate(highScoreGame.playedAt)}
          </p>
        )}
      </section>

      <section className="profile-section" aria-labelledby="profile-history-title">
        <div className="profile-section-heading">
          <h2 id="profile-history-title">Previous games</h2>
          <span>Latest {games.length}</span>
        </div>
        {games.length ? (
          <ol className="profile-games">
            {games.map((game, index) => (
              <li key={`${game.playedAt}-${index}`}>
                <span className="profile-game-title">{game.category ?? "General Knowledge"}</span>
                <strong>{game.score}/{questionsPerRound}</strong>
                <time dateTime={new Date(game.playedAt).toISOString()}>{formatDate(game.playedAt)}</time>
              </li>
            ))}
          </ol>
        ) : (
          <p className="profile-empty">Completed games will appear here.</p>
        )}
      </section>
    </div>
  );
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}
