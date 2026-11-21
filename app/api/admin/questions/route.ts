import mongoose from "mongoose";
import { hasAdminAccess } from "../../../../lib/admin-access";
import Category from "../../../../models/Category";
import Question from "../../../../models/Question";

type QuestionInput = { question: string; category: string; options: string[]; answer: string };

function questionInput(value: unknown): QuestionInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as { question?: unknown; category?: unknown; options?: unknown; answer?: unknown };
  const question = typeof input.question === "string" ? input.question.trim() : "";
  const category = typeof input.category === "string" ? input.category.trim() : "";
  const answer = typeof input.answer === "string" ? input.answer.trim() : "";
  const options = Array.isArray(input.options)
    ? input.options.map((option) => typeof option === "string" ? option.trim() : "")
    : [];
  if (
    !question || question.length > 500 || !mongoose.isValidObjectId(category) ||
    options.length !== 4 || options.some((option) => !option || option.length > 160) ||
    new Set(options).size !== options.length || !options.includes(answer)
  ) return null;
  return { question, category, options, answer };
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const [categories, questions] = await Promise.all([
      Category.find({}).select("name").lean(),
      Question.find({}).select("question category options answer").sort({ question: 1 }).limit(1000).lean(),
    ]);
    const categoryNames = new Map(categories.map((category) => [category._id.toString(), category.name]));
    const result = questions.map((question) => {
      const categoryId = question.category?.toString() ?? "";
      return {
        _id: question._id.toString(),
        question: question.question,
        category: categoryId,
        categoryName: categoryNames.get(categoryId) ?? "Unknown category",
        options: question.options,
        answer: question.answer,
      };
    });
    return Response.json({ categories, questions: result }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Could not load managed questions:", error);
    return Response.json({ error: "Could not load questions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const input = questionInput(await request.json().catch(() => null));
    if (!input) return Response.json({ error: "Enter a question, category, four different options, and a correct answer." }, { status: 400 });
    if (!(await Category.exists({ _id: input.category }))) {
      return Response.json({ error: "Choose an existing category." }, { status: 400 });
    }
    const question = await Question.create(input);
    return Response.json({ id: question._id.toString() }, { status: 201 });
  } catch (error) {
    if (isDuplicate(error)) return Response.json({ error: "That question already exists in this category." }, { status: 409 });
    console.error("Could not create question:", error);
    return Response.json({ error: "Could not create question." }, { status: 500 });
  }
}

function isDuplicate(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}
