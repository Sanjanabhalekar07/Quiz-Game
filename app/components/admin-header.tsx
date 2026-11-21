"use client";

import Link from "next/link";

type AdminIdentity = { name: string; email: string };
type AdminSection = "dashboard" | "categories" | "questions" | "admins";

export function AdminHeader({ admin, active }: { admin: AdminIdentity | null; active: AdminSection }) {
  async function signOut() {
    await fetch("/api/admin/auth/sign-out", { method: "POST" }).catch(() => undefined);
    window.location.assign("/admin/login");
  }

  return (
    <header className="admin-topbar">
      <Link className="admin-brand" href="/" aria-label="Brightside admin dashboard">
        <span className="admin-brand-mark" aria-hidden="true">q</span>
        <span>brightside</span>
      </Link>
      <nav className="admin-navigation" aria-label="Admin pages">
        <Link className={active === "dashboard" ? "active" : ""} href="/admin">Dashboard</Link>
        <Link className={active === "categories" ? "active" : ""} href="/admin/categories">Categories</Link>
        <Link className={active === "questions" ? "active" : ""} href="/admin/questions">Questions</Link>
        <Link className={active === "admins" ? "active" : ""} href="/admin/admins">Admin</Link>
      </nav>
      <div className="admin-topbar-account">
        {admin ? (
          <span className="admin-topbar-identity">
            <strong>{admin.name}</strong>
            <span>{admin.email}</span>
          </span>
        ) : null}
        <button className="admin-logout-button" onClick={signOut} type="button">Log out</button>
      </div>
    </header>
  );
}
