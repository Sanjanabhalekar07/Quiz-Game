import connectToDatabase from "../../../../lib/mongoose";
import Category from "../../../../models/Category";
import Question from "../../../../models/Question";
import mongoose from "mongoose";
import { questionsPerRound } from "../../../quiz-data";

function shuffle<T>(items: T[]) {
  for (let index = items.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [items[index], items[randomIndex]] = [items[randomIndex], items[index]];
  }
  return items;
}

export async function GET(request: Request) {
  const categoryId = new URL(request.url).searchParams.get("categoryId")?.trim();
  if (!categoryId || !mongoose.isValidObjectId(categoryId)) {
    return Response.json({ error: "Choose a valid category." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const category = await Category.findById(categoryId).select("name").lean();
    if (!category) return Response.json({ error: "Category not found." }, { status: 404 });
    // Older question documents stored the category name as a string. Query the
    // raw collection so Mongoose's ObjectId schema cast does not hide those
    // records from the public quiz.
    const records = await Question.collection.find({
      category: { $in: [new mongoose.Types.ObjectId(categoryId), categoryId, category.name] },
    }).project({ question: 1, options: 1, answer: 1 }).toArray() as Array<{
      question?: unknown;
      options?: unknown;
      answer?: unknown;
    }>;
    const usableRecords = records.filter((question) =>
      typeof question.question === "string" &&
      Array.isArray(question.options) &&
      question.options.length === 4 &&
      question.options.every((option) => typeof option === "string") &&
      typeof question.answer === "string" &&
      question.options.includes(question.answer),
    ) as Array<{ question: string; options: string[]; answer: string }>;
    const questions = shuffle(usableRecords)
      .slice(0, questionsPerRound)
      .map((question) => ({
        question: question.question,
        category: category.name,
        options: shuffle([...question.options]),
        answer: question.answer,
      }));
    if (!questions.length) return Response.json({ error: "No questions found for this category." }, { status: 404 });
    return Response.json({ questions });
  } catch (error) {
    console.error("Could not load quiz questions:", error);
    return Response.json({ error: "Could not load questions." }, { status: 503 });
  }
}
