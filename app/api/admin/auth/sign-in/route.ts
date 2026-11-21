import { scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createAdminSessionCookie } from "../../../../../lib/auth-session";
import connectToDatabase from "../../../../../lib/mongoose";
import Admin from "../../../../../models/Admin";

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string, salt: string) {
  const result = (await scrypt(password, salt, 64)) as Buffer;
  return result.toString("hex");
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Enter your admin email and password." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Enter your admin email and password." }, { status: 400 });
  }

  const input = body as { email?: unknown; password?: unknown };
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";
  if (!email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) || !password || password.length > 128) {
    return Response.json({ error: "Enter a valid email and password." }, { status: 400 });
  }
  if (!process.env.SESSION_SECRET) {
    return Response.json({ error: "Admin sign-in is not configured on the server." }, { status: 503 });
  }

  try {
    await connectToDatabase();
    const admin = await Admin.findOne({ email }).exec();
    if (!admin) return Response.json({ error: "Admin email or password is incorrect." }, { status: 401 });

    const submittedHash = Buffer.from(await hashPassword(password, admin.passwordSalt), "hex");
    const storedHash = Buffer.from(admin.passwordHash, "hex");
    if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
      return Response.json({ error: "Admin email or password is incorrect." }, { status: 401 });
    }

    return Response.json(
      { name: admin.name, email: admin.email },
      { headers: { "Set-Cookie": createAdminSessionCookie(admin._id.toString(), admin.name, admin.email) } },
    );
  } catch (error) {
    console.error("Admin sign-in failed:", error);
    return Response.json({ error: "Could not sign in right now. Please try again." }, { status: 500 });
  }
}
