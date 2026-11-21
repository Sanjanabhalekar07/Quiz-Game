import { getAdminSession } from "../../../../../lib/auth-session";
import connectToDatabase from "../../../../../lib/mongoose";
import Admin from "../../../../../models/Admin";

export async function GET(request: Request) {
  const session = getAdminSession(request);
  if (!session) return Response.json({ admin: null });

  try {
    await connectToDatabase();
    const admin = await Admin.findById(session.userId).select("name email").lean().exec();
    if (!admin) return Response.json({ admin: null });
    return Response.json({ admin: { name: admin.name, email: admin.email } });
  } catch (error) {
    console.error("Failed to load admin session:", error);
    return Response.json({ error: "Could not verify your admin session." }, { status: 500 });
  }
}
