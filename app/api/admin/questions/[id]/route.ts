import mongoose from "mongoose";
import { hasAdminAccess } from "../../../../../lib/admin-access";
import Category from "../../../../../models/Category";
import Question from "../../../../../models/Question";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Enter a valid question ID." }, { status: 400 });
    const input = await request.json().catch(() => null) as {
      question?: unknown; category?: unknown; options?: unknown; answer?: unknown;
    } | null;
    const questionText = typeof input?.question === "string" ? input.question.trim() : "";
    const category = typeof input?.category === "string" ? input.category.trim() : "";
    const answer = typeof input?.answer === "string" ? input.answer.trim() : "";
    const options = Array.isArray(input?.options)
      ? input.options.map((option) => typeof option === "string" ? option.trim() : "")
      : [];
    if (
      !questionText || questionText.length > 500 || !mongoose.isValidObjectId(category) ||
      options.length !== 4 || options.some((option) => !option || option.length > 160) ||
      new Set(options).size !== options.length || !options.includes(answer)
    ) {
      return Response.json({ error: "Enter a question, category, four different options, and a correct answer." }, { status: 400 });
    }
    if (!(await Category.exists({ _id: category }))) {
      return Response.json({ error: "Choose an existing category." }, { status: 400 });
    }
    const updated = await Question.findByIdAndUpdate(
      id,
      { question: questionText, category, options, answer },
      { new: true, runValidators: true },
    );
    if (!updated) return Response.json({ error: "Question not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    if (isDuplicate(error)) return Response.json({ error: "That question already exists in this category." }, { status: 409 });
    console.error("Could not update question:", error);
    return Response.json({ error: "Could not update question." }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: RouteContext) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const { id } = await params;
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Enter a valid question ID." }, { status: 400 });
    const deleted = await Question.findByIdAndDelete(id);
    if (!deleted) return Response.json({ error: "Question not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Could not delete question:", error);
    return Response.json({ error: "Could not delete question." }, { status: 500 });
  }
}

function isDuplicate(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}
