import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { getAuthSession, createSessionCookie } from "../../../../lib/auth-session";
import { getDatabase } from "../../../../lib/mongodb";
import type { ScoreEntry } from "../../../quiz-data";

const scrypt = promisify(scryptCallback);

type Account = {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
};

async function hashPassword(password: string, salt: string) {
  return ((await scrypt(password, salt, 64)) as Buffer).toString("hex");
}

export async function GET(request: Request) {
  const session = getAuthSession(request);
  if (!session) return Response.json({ error: "Please sign in to view your profile." }, { status: 401 });

  try {
    const db = await getDatabase();
    const account = await db.collection<Account>("users").findOne(
      { email: session.email },
      { projection: { _id: 0, name: 1, email: 1 } },
    );
    if (!account) return Response.json({ error: "Account not found." }, { status: 404 });

    const scores = db.collection<ScoreEntry>("scores");
    const [games, highScoreGame] = await Promise.all([
      scores.find({ email: session.email }, { projection: { _id: 0 } })
        .sort({ playedAt: -1 }).limit(20).toArray(),
      scores.find({ email: session.email }, { projection: { _id: 0 } })
        .sort({ score: -1, playedAt: -1 }).limit(1).next(),
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
    const db = await getDatabase();
    const accounts = db.collection<Account>("users");
    await accounts.createIndex({ email: 1 }, { unique: true });
    const account = await accounts.findOne({ email: session.email });
    if (!account) return Response.json({ error: "Account not found." }, { status: 404 });

    const submittedHash = Buffer.from(await hashPassword(currentPassword, account.passwordSalt), "hex");
    const storedHash = Buffer.from(account.passwordHash, "hex");
    if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
      return Response.json({ error: "Current password is incorrect." }, { status: 401 });
    }

    if (email !== session.email && await accounts.findOne({ email })) {
      return Response.json({ error: "That email is already in use." }, { status: 409 });
    }

    const update: Partial<Account> = { name, email };
    if (newPassword) {
      const passwordSalt = randomBytes(16).toString("hex");
      update.passwordSalt = passwordSalt;
      update.passwordHash = await hashPassword(newPassword, passwordSalt);
    }
    await accounts.updateOne({ email: session.email }, { $set: update });
    await db.collection<ScoreEntry>("scores").updateMany(
      { email: session.email },
      { $set: { email, name } },
    );

    return Response.json(
      { profile: { name, email } },
      { headers: { "Set-Cookie": createSessionCookie(name, email) } },
    );
  } catch (error) {
    console.error("Failed to update profile:", error);
    return Response.json({ error: "Could not update your profile." }, { status: 500 });
  }
}
