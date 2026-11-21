import { getAuthSession } from "../../../../lib/auth-session";
import connectToDatabase from "../../../../lib/mongoose";
import Score from "../../../../models/Score";

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ error: "Please sign in to view game history." }, { status: 401 });

  try {
    await connectToDatabase();
    const games = await Score.find({ user_id: session.userId })
      .select("-_id -user_id")
      .sort({ playedAt: -1 })
      .limit(20)
      .lean()
      .exec();

    return Response.json({ games });
  } catch (error) {
    console.error("Failed to load game history:", error);
    return Response.json({ error: "Could not load game history." }, { status: 500 });
  }
}
