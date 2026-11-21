import { getAdminSession } from "./auth-session";
import connectToDatabase from "./mongoose";
import Admin from "../models/Admin";

export async function hasAdminAccess(request: Request) {
  const session = getAdminSession(request);
  if (!session) return false;
  await connectToDatabase();
  return Boolean(await Admin.exists({ _id: session.userId }));
}
