"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { AdminHeader } from "./admin-header";

type AdminIdentity = { name: string; email: string };
type Category = { _id: string; name: string };
type Question = {
  _id: string;
  question: string;
  category: string;
  categoryName: string;
  options: string[];
  answer: string;
};
type QuestionForm = { question: string; category: string; options: string[]; answer: string };
const emptyForm: QuestionForm = { question: "", category: "", options: ["", "", "", ""], answer: "" };

function paginationItems(currentPage: number, totalPages: number) {
  if (totalPages <= 5) return Array.from({ length: totalPages }, (_, index) => index + 1) as Array<number | "ellipsis">;
  if (currentPage <= 3) return [1, 2, 3, "ellipsis", totalPages] as Array<number | "ellipsis">;
  if (currentPage >= totalPages - 2) {
    return [1, "ellipsis", totalPages - 2, totalPages - 1, totalPages] as Array<number | "ellipsis">;
  }
  return [1, "ellipsis", currentPage - 1, currentPage, currentPage + 1, "ellipsis", totalPages] as Array<number | "ellipsis">;
}

function PaginationArrow({ double = false, direction }: { double?: boolean; direction: "left" | "right" }) {
  const left = direction === "left";
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {double ? (left
        ? <path d="m7 3-5 5 5 5M14 3 9 8l5 5" />
        : <path d="m9 3 5 5-5 5M2 3l5 5-5 5" />)
        : left
          ? <path d="m10 3-5 5 5 5" />
          : <path d="m6 3 5 5-5 5" />}
    </svg>
  );
}

export function AdminQuestionsManager() {
  const router = useRouter();
  const [admin, setAdmin] = useState<AdminIdentity | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalQuestions, setTotalQuestions] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [form, setForm] = useState<QuestionForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pageLoading, setPageLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadQuestions(page = currentPage) {
    setPageLoading(true);
    try {
      const response = await fetch(`/api/admin/questions?page=${page}`, { cache: "no-store" });
      const data = (await response.json()) as {
        categories?: Category[];
        questions?: Question[];
        total?: number;
        page?: number;
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Could not load questions.");
      setCategories(data.categories ?? []);
      setQuestions(data.questions ?? []);
      setTotalQuestions(data.total ?? 0);
      setCurrentPage(data.page ?? page);
      if (!form.category && data.categories?.[0]) {
        setForm((current) => ({ ...current, category: data.categories![0]._id }));
      }
    } finally {
      setPageLoading(false);
    }
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
        await loadQuestions();
      } catch (reason) {
        if (active) setError(reason instanceof Error ? reason.message : "Could not load questions.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [router]);

  function updateOption(index: number, value: string) {
    setForm((current) => {
      const options = [...current.options];
      const previous = options[index];
      options[index] = value;
      return {
        ...current,
        options,
        answer: current.answer === previous || !current.answer ? value : current.answer,
      };
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    const wasEditing = Boolean(editingId);
    try {
      const response = await fetch(editingId ? `/api/admin/questions/${editingId}` : "/api/admin/questions", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not save question.");
      await loadQuestions(wasEditing ? currentPage : 1);
      const category = form.category;
      setForm({ ...emptyForm, category });
      setEditingId(null);
      setMessage(wasEditing ? "Question updated." : "Question created.");
      setModalOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  }

  function editQuestion(question: Question) {
    setEditingId(question._id);
    setForm({
      question: question.question,
      category: question.category,
      options: [...question.options],
      answer: question.answer,
    });
    setMessage("");
    setError("");
    setModalOpen(true);
  }

  function addQuestion() {
    setEditingId(null);
    setForm(emptyForm);
    setMessage("");
    setError("");
    if (!categories.length) {
      setError("Create a category before adding questions.");
      return;
    }
    setModalOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setModalOpen(false);
    setEditingId(null);
    setForm({ ...emptyForm, category: categories[0]?._id ?? "" });
    setError("");
  }

  async function deleteQuestion(question: Question) {
    if (!window.confirm("Delete this question?")) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/admin/questions/${question._id}`, { method: "DELETE" });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete question.");
      const nextPage = questions.length === 1 && currentPage > 1 ? currentPage - 1 : currentPage;
      await loadQuestions(nextPage);
      if (editingId === question._id) {
        setEditingId(null);
        setForm({ ...emptyForm, category: question.category });
      }
      setMessage("Question deleted.");
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not delete question.");
    }
  }

  const totalPages = Math.max(1, Math.ceil(totalQuestions / 20));

  return (
    <main className="admin-dashboard-page">
      <AdminHeader admin={admin} active="questions" />
      <div className="admin-dashboard-content admin-question-content">
        <section className="admin-welcome">
          <p className="admin-eyebrow"><span className="admin-status-dot" /> CONTENT MANAGEMENT</p>
          <h1>Manage questions</h1>
          <p>Add, edit, or remove questions from a category.</p>
        </section>

        <div className="admin-question-toolbar">
          <button className="admin-primary-button" type="button" onClick={addQuestion}>Add Question</button>
        </div>
        {message ? <p className="admin-success-message" role="status">{message}</p> : null}
        {error && !modalOpen ? <p className="admin-table-error" role="alert">{error}</p> : null}

        <div className="admin-manage-grid questions-manage-grid">
          <section className="admin-list-card" aria-labelledby="question-list-title">
            <div className="admin-list-heading">
              <div><h2 id="question-list-title">Questions</h2><p>{totalQuestions} total</p></div>
            </div>
            {loading || pageLoading ? <p className="admin-table-message" role="status">Loading questions…</p> : null}
            {!loading && !pageLoading && questions.length === 0 ? <p className="admin-table-message">No questions yet. Add one to get started.</p> : null}
            {!pageLoading ? (
              <ul className="admin-question-list">
                {questions.map((question) => (
                  <li key={question._id}>
                    <div className="admin-question-copy">
                      <span className="admin-question-category">{question.categoryName}</span>
                      <strong>{question.question}</strong>
                      <span className="admin-question-answer">Correct answer: {question.answer}</span>
                    </div>
                    <span className="admin-row-actions">
                      <button className="admin-row-button" onClick={() => editQuestion(question)} type="button">Edit</button>
                      <button className="admin-row-button danger" onClick={() => void deleteQuestion(question)} type="button">Delete</button>
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            {totalQuestions > 20 ? (
              <nav className="admin-pagination" aria-label="Question pages">
                <div className="admin-pagination-pages">
                  <button aria-label="First page" className="admin-page-button" disabled={currentPage <= 1 || pageLoading}
                    onClick={() => void loadQuestions(1).catch(() => undefined)} type="button">
                    <PaginationArrow double direction="left" />
                  </button>
                  <button aria-label="Previous page" className="admin-page-button" disabled={currentPage <= 1 || pageLoading}
                    onClick={() => void loadQuestions(currentPage - 1).catch(() => undefined)} type="button">
                    <PaginationArrow direction="left" />
                  </button>
                  {paginationItems(currentPage, totalPages).map((item, index) => item === "ellipsis" ? (
                    <span aria-hidden="true" className="admin-page-ellipsis" key={`ellipsis-${index}`}>…</span>
                  ) : (
                    <button aria-current={item === currentPage ? "page" : undefined}
                      className={`admin-page-button${item === currentPage ? " active" : ""}`}
                      disabled={pageLoading} key={item}
                      onClick={() => void loadQuestions(item).catch(() => undefined)} type="button">
                      {item}
                    </button>
                  ))}
                  <button aria-label="Next page" className="admin-page-button" disabled={currentPage >= totalPages || pageLoading}
                    onClick={() => void loadQuestions(currentPage + 1).catch(() => undefined)} type="button">
                    <PaginationArrow direction="right" />
                  </button>
                  <button aria-label="Last page" className="admin-page-button" disabled={currentPage >= totalPages || pageLoading}
                    onClick={() => void loadQuestions(totalPages).catch(() => undefined)} type="button">
                    <PaginationArrow double direction="right" />
                  </button>
                </div>
                <label className="admin-pagination-select">
                  <span>Page</span>
                  <select disabled={pageLoading} value={currentPage} onChange={(event) => void loadQuestions(Number(event.target.value)).catch(() => undefined)}>
                    {Array.from({ length: totalPages }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}</option>)}
                  </select>
                  <span>of {totalPages}</span>
                </label>
              </nav>
            ) : null}
          </section>
        </div>

        {modalOpen ? (
          <div className="admin-modal-backdrop" onMouseDown={(event) => {
            if (event.target === event.currentTarget) closeModal();
          }}>
            <section className="admin-question-modal" role="dialog" aria-modal="true" aria-labelledby="question-form-title">
              <div className="admin-category-modal-heading">
                <h2 id="question-form-title">{editingId ? "Edit question" : "Add a question"}</h2>
                <button className="admin-modal-close" type="button" aria-label="Close" onClick={closeModal}>×</button>
              </div>
              <form className="admin-editor-form" onSubmit={submit}>
                <label htmlFor="question-category">Category</label>
                <select id="question-category" required value={form.category}
                  onChange={(event) => setForm({ ...form, category: event.target.value })}>
                  <option value="" disabled>Select a category</option>
                  {categories.map((category) => <option key={category._id} value={category._id}>{category.name}</option>)}
                </select>
                <label htmlFor="question-text">Question</label>
                <textarea id="question-text" maxLength={500} required rows={3} value={form.question}
                  onChange={(event) => setForm({ ...form, question: event.target.value })} />
                <fieldset className="admin-options-fieldset">
                  <legend>Answer options</legend>
                  {form.options.map((option, index) => (
                    <label className="admin-option-input" key={index}>
                      <span>Option {index + 1}</span>
                      <input maxLength={160} required value={option}
                        onChange={(event) => updateOption(index, event.target.value)} />
                    </label>
                  ))}
                </fieldset>
                <label htmlFor="question-answer">Correct answer</label>
                <select id="question-answer" required value={form.answer}
                  onChange={(event) => setForm({ ...form, answer: event.target.value })}>
                  <option value="" disabled>Select the correct option</option>
                  {form.options.filter(Boolean).map((option, index) => (
                    <option key={`${index}-${option}`} value={option}>{option}</option>
                  ))}
                </select>
                {error ? <p className="admin-table-error" role="alert">{error}</p> : null}
                <div className="admin-modal-actions">
                  <button className="admin-secondary-button" disabled={saving} type="button" onClick={closeModal}>Cancel</button>
                  <button className="admin-primary-button" disabled={saving || !categories.length} type="submit">
                    {saving ? "Saving…" : editingId ? "Save changes" : "Create question"}
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
