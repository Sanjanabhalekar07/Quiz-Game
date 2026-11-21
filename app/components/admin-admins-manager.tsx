"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "./admin-header";

type AdminIdentity = { name: string; email: string };
type ManagedAdmin = { _id: string; name: string; email: string; createdAt?: string };
type AdminForm = { name: string; email: string; password: string };

export function AdminAdminsManager() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [admins, setAdmins] = useState<ManagedAdmin[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AdminForm>({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadAdmins() {
    const response = await fetch("/api/admin/admins", { cache: "no-store" });
    const data = await response.json() as { admins?: ManagedAdmin[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load admins.");
    setAdmins(data.admins ?? []);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/auth/session", { cache: "no-store" });
        const data = await response.json() as { admin?: AdminIdentity | null };
        if (!active) return;
        if (!response.ok || !data.admin) {
          router.replace("/admin/login");
          return;
        }
        setAdmin(data.admin);
        await loadAdmins();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load admins.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  function editAdmin(target: ManagedAdmin) {
    setEditingId(target._id);
    setForm({ name: target.name, email: target.email, password: "" });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function addAdmin() {
    setEditingId(null);
    setForm({ name: "", email: "", password: "" });
    setError("");
    setMessage("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm({ name: "", email: "", password: "" });
    setError("");
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/admins", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...form } : form),
      });
      const data = await response.json() as { admin?: ManagedAdmin; error?: string };
      if (!response.ok) throw new Error(data.error ?? (editingId ? "Could not update admin." : "Could not create admin."));
      const previous = admins.find((item) => item._id === editingId);
      await loadAdmins();
      if (previous && admin?.email === previous.email) setAdmin({ name: form.name, email: form.email });
      setMessage(editingId ? "Admin updated." : "Admin created.");
      setModalOpen(false);
      setEditingId(null);
      setForm({ name: "", email: "", password: "" });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update admin.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteAdmin(target: ManagedAdmin) {
    if (!window.confirm(`Delete admin account for ${target.email}?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/admins?id=${encodeURIComponent(target._id)}`, { method: "DELETE" });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete admin.");
      if (admin?.email === target.email) {
        await fetch("/api/admin/auth/sign-out", { method: "POST" }).catch(() => undefined);
        router.replace("/admin/login");
        return;
      }
      await loadAdmins();
      setMessage("Admin deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete admin.");
    }
  }

  return (
    <main className="admin-dashboard-page">
      <AdminHeader admin={admin} active="admins" />
      <div className="admin-dashboard-content admin-admin-content">
        <section className="admin-welcome">
          <p className="admin-eyebrow"><span className="admin-status-dot" /> ADMINISTRATION</p>
          <h1>Manage Admin</h1>
          <p>Edit administrator details or remove an administrator account.</p>
        </section>

        <div className="admin-admin-toolbar">
          <button className="admin-primary-button" type="button" onClick={addAdmin}>Add Admin</button>
        </div>
        {message ? <p className="admin-success-message" role="status">{message}</p> : null}
        {error && !modalOpen ? <p className="admin-table-error" role="alert">{error}</p> : null}

        <section className="admin-list-card" aria-labelledby="admin-list-title">
          <div className="admin-list-heading">
            <div><h2 id="admin-list-title">Admins</h2><p>{admins.length} administrator accounts</p></div>
          </div>
          {loading ? <p className="admin-table-message" role="status">Loading admins…</p> : null}
          {!loading && admins.length === 0 ? <p className="admin-table-message">No admin accounts found.</p> : null}
          <ul className="admin-managed-list">
            {admins.map((item) => (
              <li key={item._id}>
                  <span className="admin-managed-avatar" aria-hidden="true">{item.name.trim().slice(0, 1).toUpperCase() || "A"}</span>
                  <span className="admin-managed-copy">
                    <strong>{item.name}</strong>
                    <span>{item.email}</span>
                    {item.createdAt ? <span className="admin-managed-date">Added {new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(item.createdAt))}</span> : null}
                  </span>
                  <span className="admin-row-actions">
                    <button className="admin-row-button" onClick={() => editAdmin(item)} type="button">Edit</button>
                    {item.email !== admin?.email ? (
                      <button className="admin-row-button danger" onClick={() => void deleteAdmin(item)} type="button">Delete</button>
                    ) : null}
                  </span>
              </li>
            ))}
          </ul>
        </section>

        {modalOpen ? (
          <div className="admin-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}>
            <section className="admin-category-modal" role="dialog" aria-modal="true" aria-labelledby="admin-edit-title">
              <div className="admin-category-modal-heading">
                <h2 id="admin-edit-title">{editingId ? "Edit admin" : "Add admin"}</h2>
                <button className="admin-modal-close" type="button" aria-label="Close" onClick={closeModal}>×</button>
              </div>
              <form className="admin-editor-form" onSubmit={submit}>
                <label htmlFor="managed-admin-name">Name</label>
                <input id="managed-admin-name" maxLength={80} required value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <label htmlFor="managed-admin-email">Email</label>
                <input id="managed-admin-email" type="email" maxLength={254} required value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })} />
                <label htmlFor="managed-admin-password">Password <span className="admin-field-hint">{editingId ? "(optional)" : "(required)"}</span></label>
                <input id="managed-admin-password" type="password" autoComplete="new-password" minLength={8} maxLength={128}
                  required={!editingId} placeholder={editingId ? "Leave blank to keep current password" : "At least 8 characters"} value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })} />
                {error ? <p className="admin-table-error" role="alert">{error}</p> : null}
                <div className="admin-modal-actions">
                  <button className="admin-secondary-button" disabled={saving} type="button" onClick={closeModal}>Cancel</button>
                  <button className="admin-primary-button" disabled={saving} type="submit">
                    {saving ? "Saving…" : editingId ? "Save changes" : "Create admin"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}
