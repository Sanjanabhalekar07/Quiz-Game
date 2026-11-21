import { getAuthSession } from "../../../lib/auth-session";
import connectToDatabase from "../../../lib/mongoose";
import Score from "../../../models/Score";

export async function GET() {
  try {
    await connectToDatabase();
    const scores = await Score.find()
      .select("-_id -user_id")
      .sort({ score: -1, playedAt: -1 })
      .limit(10)
      .lean()
      .exec();

    return Response.json({ scores });
  } catch (error) {
    console.error("Failed to load quiz scores:", error);
    return Response.json({ error: "Could not load scores." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ error: "Please sign in to save a score." }, { status: 401 });

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid score." }, { status: 400 });
  }

  const score = body as { category?: unknown; score?: unknown; playedAt?: unknown };
  const category = typeof score.category === "string" ? score.category : "";
  const numericScore = typeof score.score === "number" ? score.score : Number.NaN;
  const playedAt = typeof score.playedAt === "number" ? score.playedAt : Number.NaN;

  if (
    !category ||
    category.length > 80 ||
    !Number.isInteger(numericScore) ||
    numericScore < 0 ||
    numericScore > 10 ||
    !Number.isFinite(playedAt)
  ) {
    return Response.json({ error: "Invalid score." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    await Score.create({
      user_id: session.userId,
      category,
      score: numericScore,
      playedAt,
    });

    const [scores, games] = await Promise.all([
      Score.find()
        .select("-_id -user_id")
        .sort({ score: -1, playedAt: -1 })
        .limit(10)
        .lean()
        .exec(),
      Score.find({ user_id: session.userId })
        .select("-_id -user_id")
        .sort({ playedAt: -1 })
        .limit(20)
        .lean()
        .exec(),
    ]);

    return Response.json({ scores, games });
  } catch (error) {
    console.error("Failed to save quiz score:", error);
    return Response.json({ error: "Could not save score." }, { status: 500 });
  }
}
