import { getDatabase } from "../../../lib/mongodb";
import { getAuthSession } from "../../../lib/auth-session";
import type { ScoreEntry } from "../../quiz-data";

export async function GET() {
  try {
    const db = await getDatabase();
    const scores = await db
      .collection<ScoreEntry>("scores")
      .find({}, { projection: { _id: 0 } })
      .sort({ score: -1, playedAt: -1 })
      .limit(10)
      .toArray();

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

  const score = body as Partial<ScoreEntry>;
  const category = typeof score.category === "string" ? score.category : "";

  if (
    !category ||
    category.length > 80 ||
    !Number.isInteger(score.score) ||
    score.score! < 0 ||
    score.score! > 10 ||
    !Number.isFinite(score.playedAt)
  ) {
    return Response.json({ error: "Invalid score." }, { status: 400 });
  }

  try {
    const db = await getDatabase();
    await db.collection<ScoreEntry>("scores").insertOne({
      name: session.name,
      email: session.email,
      category,
      score: score.score!,
      playedAt: score.playedAt!,
    });

    const [scores, games] = await Promise.all([
      db.collection<ScoreEntry>("scores")
        .find({}, { projection: { _id: 0 } })
        .sort({ score: -1, playedAt: -1 })
        .limit(10)
        .toArray(),
      db.collection<ScoreEntry>("scores")
        .find({ email: session.email }, { projection: { _id: 0 } })
        .sort({ playedAt: -1 })
        .limit(20)
        .toArray(),
    ]);

    return Response.json({ scores, games });
  } catch (error) {
    console.error("Failed to save quiz score:", error);
    return Response.json({ error: "Could not save score." }, { status: 500 });
  }
}
