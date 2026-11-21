import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getAuthSession, createSessionCookie } from "../../../../lib/auth-session";
import connectToDatabase from "../../../../lib/mongoose";
import Score from "../../../../models/Score";
import User from "../../../../models/User";

const scrypt = promisify(scryptCallback);

async function hashPassword(password: string, salt: string) {
  return ((await scrypt(password, salt, 64)) as Buffer).toString("hex");
}

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ error: "Please sign in to view your profile." }, { status: 401 });

  try {
    await connectToDatabase();
    const account = await User.findOne({ email: session.email }).select("name email").exec();
    if (!account) return Response.json({ error: "Account not found." }, { status: 404 });

    const [games, highScoreGame] = await Promise.all([
      Score.find({ user_id: session.userId }).select("-_id -user_id").sort({ playedAt: -1 }).limit(20).lean().exec(),
      Score.findOne({ user_id: session.userId }).select("-_id -user_id").sort({ score: -1, playedAt: -1 }).lean().exec(),
    ]);

    return Response.json({
      profile: { name: account.name, email: account.email },
      games,
      highScoreGame,
    });
  } catch (error) {
    console.error("Failed to load profile:", error);
    return Response.json({ error: "Could not load your profile." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ error: "Please sign in to update your profile." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid profile details." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid profile details." }, { status: 400 });
  }

  const input = body as {
    name?: unknown;
    email?: unknown;
    currentPassword?: unknown;
    newPassword?: unknown;
  };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const currentPassword = typeof input.currentPassword === "string" ? input.currentPassword : "";
  const newPassword = typeof input.newPassword === "string" ? input.newPassword : "";

  if (
    !name || name.length > 40 || !email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) ||
    currentPassword.length < 8 || currentPassword.length > 128 ||
    (newPassword && (newPassword.length < 8 || newPassword.length > 128))
  ) {
    return Response.json({ error: "Enter a valid name, email, and current password. New passwords must be at least 8 characters." }, { status: 400 });
  }

  try {
    await connectToDatabase();
    const account = await User.findOne({ email: session.email }).exec();
    if (!account) return Response.json({ error: "Account not found." }, { status: 404 });

    const submittedHash = Buffer.from(await hashPassword(currentPassword, account.passwordSalt), "hex");
    const storedHash = Buffer.from(account.passwordHash, "hex");
    if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    if (email !== session.email && await User.exists({ email })) {
      return Response.json({ error: "That email is already in use." }, { status: 409 });
    }

    account.name = name;
    account.email = email;
    if (newPassword) {
      const passwordSalt = randomBytes(16).toString("hex");
      account.passwordSalt = passwordSalt;
      account.passwordHash = await hashPassword(newPassword, passwordSalt);
    }
    await account.save();
    return Response.json(
      { profile: { name, email } },
      { headers: { "Set-Cookie": createSessionCookie(account._id.toString(), name, email) } },
    );
  } catch (error) {
    console.error("Failed to update profile:", error);
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return Response.json({ error: "That email is already in use." }, { status: 409 });
    }
    return Response.json({ error: "Could not update your profile." }, { status: 500 });
  }
}
