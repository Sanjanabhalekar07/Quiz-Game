import { getDatabase } from "../../../../lib/mongodb";
import { getAuthSession } from "../../../../lib/auth-session";
import type { ScoreEntry } from "../../../quiz-data";

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ error: "Please sign in to view game history." }, { status: 401 });

  try {
    const db = await getDatabase();
    const games = await db
      .collection<ScoreEntry>("scores")
      .find({ email: session.email }, { projection: { _id: 0 } })
      .sort({ playedAt: -1 })
      .limit(20)
      .toArray();

    return Response.json({ games });
  } catch (error) {
    console.error("Failed to load game history:", error);
    return Response.json({ error: "Could not load game history." }, { status: 500 });
  }
}
