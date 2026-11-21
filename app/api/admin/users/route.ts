import { getAdminSession } from "../../../../lib/auth-session";
import connectToDatabase from "../../../../lib/mongoose";
import Admin from "../../../../models/Admin";
import Category from "../../../../models/Category";
import Question from "../../../../models/Question";
import Score from "../../../../models/Score";
import User from "../../../../models/User";

export async function GET(request: Request) {
  const session = getAdminSession(request);
  if (!session) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });

  try {
    await connectToDatabase();
    const adminExists = await Admin.exists({ _id: session.userId });
    if (!adminExists) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });

    const [total, users, categoryCount, questionCount, gamesPlayed] = await Promise.all([
      User.countDocuments({}),
      User.find({})
        .select("name email createdAt -_id")
        .sort({ createdAt: -1 })
        .limit(500)
        .lean(),
      Category.countDocuments({}),
      Question.countDocuments({}),
      Score.countDocuments({}),
    ]);

    return Response.json(
      { total, users, categoryCount, questionCount, gamesPlayed },
      { headers: { "Cache-Control": "no-store, private" } },
    );
  } catch (error) {
    console.error("Failed to load admin user list:", error);
    return Response.json({ error: "Could not load users." }, { status: 500 });
  }
}
