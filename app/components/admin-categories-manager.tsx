"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "./admin-header";

type AdminIdentity = { name: string; email: string };
type Category = { _id: string; name: string; icon: string; description: string };
type CategoryForm = { name: string; icon: string; description: string };
const emptyForm: CategoryForm = { name: "", icon: "✦", description: "" };

export function AdminCategoriesManager() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadCategories() {
    const response = await fetch("/api/admin/categories", { cache: "no-store" });
    const data = (await response.json()) as { categories?: Category[]; error?: string };
    if (!response.ok) throw new Error(data.error ?? "Could not load categories.");
    setCategories(data.categories ?? []);
  }

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch("/api/admin/auth/session", { cache: "no-store" });
        const data = (await response.json()) as { admin?: AdminIdentity | null };
        if (!active) return;
        if (!response.ok || !data.admin) {
          router.replace("/admin/login");
          return;
        }
        setAdmin(data.admin);
        await loadCategories();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load categories.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/admin/categories", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, category: form } : form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save category.");
      await loadCategories();
      setForm(emptyForm);
      setEditingId(null);
      setMessage(editingId ? "Category updated." : "Category created.");
      setModalOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save category.");
    } finally {
      setSaving(false);
    }
  }

  function editCategory(category: Category) {
    setEditingId(category._id);
    setForm({ name: category.name, icon: category.icon, description: category.description });
    setMessage("");
    setError("");
    setModalOpen(true);
  }

  function addCategory() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm(emptyForm);
    setError("");
  }

  async function deleteCategory(category: Category) {
    if (!window.confirm(`Delete the category “${category.name}”?`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/categories?id=${encodeURIComponent(category._id)}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete category.");
      await loadCategories();
      if (editingId === category._id) {
        setEditingId(null);
        setForm(emptyForm);
      }
      setMessage("Category deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete category.");
    }
  }

  return (
    <main className="admin-dashboard-page">
      <AdminHeader admin={admin} active="categories" />
      <div className="admin-dashboard-content admin-category-content">
        <section className="admin-welcome">
          <p className="admin-eyebrow"><span className="admin-status-dot" /> CONTENT MANAGEMENT</p>
          <h1>Manage categories</h1>
          <p>Create and organize the topics players can choose.</p>
        </section>

        <div className="admin-category-toolbar">
          <button className="admin-primary-button" type="button" onClick={addCategory}>Add Category</button>
        </div>
        {message ? <p className="admin-success-message" role="status">{message}</p> : null}
        {error && !modalOpen ? <p className="admin-table-error" role="alert">{error}</p> : null}

        <div className="admin-manage-grid admin-category-manage-grid">
          <section className="admin-list-card" aria-labelledby="category-list-title">
            <div className="admin-list-heading">
              <div><h2 id="category-list-title">Categories</h2><p>{categories.length} available</p></div>
            </div>
            {loading ? <p className="admin-table-message" role="status">Loading categories…</p> : null}
            {!loading && categories.length === 0 ? <p className="admin-table-message">No categories yet. Add one to get started.</p> : null}
            <ul className="admin-category-list">
              {categories.map((category) => (
                <li key={category._id}>
                  <span className="admin-category-icon" aria-hidden="true">{category.icon}</span>
                  <span className="admin-category-copy"><strong>{category.name}</strong><span>{category.description}</span></span>
                  <span className="admin-row-actions">
                    <button className="admin-row-button" onClick={() => editCategory(category)} type="button">Edit</button>
                    <button className="admin-row-button danger" onClick={() => void deleteCategory(category)} type="button">Delete</button>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {modalOpen ? (
          <div className="admin-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}>
            <section className="admin-category-modal" role="dialog" aria-modal="true" aria-labelledby="category-form-title">
              <div className="admin-category-modal-heading">
                <h2 id="category-form-title">{editingId ? "Edit category" : "Add a category"}</h2>
                <button className="admin-modal-close" type="button" aria-label="Close" onClick={closeModal}>×</button>
              </div>
              <form className="admin-editor-form" onSubmit={submit}>
                <label htmlFor="category-name">Name</label>
                <input id="category-name" maxLength={80} required value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })} />
                <label htmlFor="category-icon">Icon</label>
                <input id="category-icon" maxLength={16} required value={form.icon}
                  onChange={(event) => setForm({ ...form, icon: event.target.value })} />
                <label htmlFor="category-description">Description</label>
                <textarea id="category-description" maxLength={200} required rows={3} value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })} />
                {error ? <p className="admin-table-error" role="alert">{error}</p> : null}
                <div className="admin-modal-actions">
                  <button className="admin-secondary-button" disabled={saving} type="button" onClick={closeModal}>Cancel</button>
                  <button className="admin-primary-button" disabled={saving} type="submit">
                    {saving ? "Saving…" : editingId ? "Save changes" : "Create category"}
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
