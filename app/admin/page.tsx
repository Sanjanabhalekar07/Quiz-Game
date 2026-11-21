"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "../components/admin-header";

type AdminIdentity = { name: string; email: string };
type AdminUser = { name: string; email: string; createdAt?: string };

export default function AdminDashboardPage() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userCount, setUserCount] = useState(0);
  const [categoryCount, setCategoryCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [gamesPlayed, setGamesPlayed] = useState(0);
  const [usersError, setUsersError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadDashboard() {
      try {
        const sessionResponse = await fetch("/api/admin/auth/session", { cache: "no-store" });
        const sessionData = (await sessionResponse.json()) as { admin?: AdminIdentity | null };
        if (!active) return;
        if (!sessionResponse.ok || !sessionData.admin) {
          router.replace("/admin/login");
          return;
        }
        setAdmin(sessionData.admin);

        const usersResponse = await fetch("/api/admin/users", { cache: "no-store" });
        const usersData = (await usersResponse.json()) as {
          total?: number;
          users?: AdminUser[];
          categoryCount?: number;
          questionCount?: number;
          gamesPlayed?: number;
          error?: string;
        };
        if (!active) return;
        if (!usersResponse.ok) throw new Error(usersData.error ?? "Could not load users.");
        setUsers(usersData.users ?? []);
        setUserCount(usersData.total ?? 0);
        setCategoryCount(usersData.categoryCount ?? 0);
        setQuestionCount(usersData.questionCount ?? 0);
        setGamesPlayed(usersData.gamesPlayed ?? 0);
      } catch (error) {
        if (active) setUsersError(error instanceof Error ? error.message : "Could not load users.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadDashboard();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="admin-dashboard-page">
      <AdminHeader admin={admin} active="dashboard" />

      <div className="admin-dashboard-content">
        <section className="admin-welcome">
          <p className="admin-eyebrow"><span className="admin-status-dot" /> ADMINISTRATOR</p>
          <h1>Admin dashboard</h1>
          <p>Manage and review Brightside player accounts.</p>
        </section>

        <section className="admin-summary-grid" aria-label="Admin dashboard summary">
          <article className="admin-summary-card">
            <span className="admin-summary-label">Registered users</span>
            <strong className="admin-summary-number">{loading ? "—" : userCount}</strong>
            <span className="admin-summary-caption">Player accounts</span>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-label">No. of Categories</span>
            <strong className="admin-summary-number">{loading ? "—" : categoryCount}</strong>
            <span className="admin-summary-caption">Available quiz topics</span>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-label">No. of Questions</span>
            <strong className="admin-summary-number">{loading ? "—" : questionCount}</strong>
            <span className="admin-summary-caption">Questions in the quiz bank</span>
          </article>
          <article className="admin-summary-card">
            <span className="admin-summary-label">No. of Games Played</span>
            <strong className="admin-summary-number">{loading ? "—" : gamesPlayed}</strong>
            <span className="admin-summary-caption">Completed rounds recorded</span>
          </article>
        </section>

        <section className="admin-users-card" aria-labelledby="admin-users-title">
          <div className="admin-users-card-header">
            <div>
              <h2 id="admin-users-title">Users</h2>
              <p>Player accounts registered with Brightside.</p>
            </div>
            <span className="admin-users-count">{userCount} total</span>
          </div>

          {loading ? <p className="admin-table-message" role="status">Loading users…</p> : null}
          {usersError ? <p className="admin-table-error" role="alert">{usersError}</p> : null}
          {!loading && !usersError && users.length === 0 ? (
            <p className="admin-table-message">No users have registered yet.</p>
          ) : null}

          {!loading && users.length > 0 ? (
            <div className="admin-users-table-wrap">
              <table className="admin-users-table">
                <colgroup>
                  <col className="admin-user-name-column" />
                  <col className="admin-user-email-column" />
                  <col className="admin-user-date-column" />
                </colgroup>
                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Email</th>
                    <th scope="col">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.email}>
                      <td className="admin-user-name-cell">{user.name}</td>
                      <td className="admin-user-email-cell">{user.email}</td>
                      <td>
                        {user.createdAt
                          ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(user.createdAt))
                          : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {userCount > users.length ? (
            <p className="admin-table-footnote">Showing the 500 most recent users.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
