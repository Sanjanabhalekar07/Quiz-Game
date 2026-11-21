import { getAuthSession } from "../../../../lib/auth-session";
import connectToDatabase from "../../../../lib/mongoose";
import User from "../../../../models/User";

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ user: null });

  try {
    await connectToDatabase();
    const user = await User.findById(session.userId).select("name email").lean().exec();
    if (!user) return Response.json({ user: null });
    return Response.json({ user: { name: user.name, email: user.email } });
  } catch (error) {
    console.error("Failed to load signed-in user:", error);
    return Response.json({ error: "Could not verify your session." }, { status: 500 });
  }
}
