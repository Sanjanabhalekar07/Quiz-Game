import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { createSessionCookie } from "../../../../lib/auth-session";
import { getDatabase } from "../../../../lib/mongodb";

const scrypt = promisify(scryptCallback);

type Account = {
  name: string;
  email: string;
  passwordHash: string;
  passwordSalt: string;
};

async function hashPassword(password: string, salt: string) {
  const result = (await scrypt(password, salt, 64)) as Buffer;
  return result.toString("hex");
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Please enter valid sign-in details." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Please enter valid sign-in details." }, { status: 400 });
  }

  const input = body as { name?: unknown; email?: unknown; password?: unknown };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (
    !email || email.length > 254 || !/^\S+@\S+\.\S+$/.test(email) ||
    password.length < 8 || password.length > 128 || (name && name.length > 40)
  ) {
    return Response.json({ error: "Enter a valid email and a password of at least 8 characters." }, { status: 400 });
  }

  const sessionSecret = process.env.SESSION_SECRET;
  if (!sessionSecret) {
    return Response.json({ error: "Sign-in is not configured on the server." }, { status: 503 });
  }

  try {
    const db = await getDatabase();
    const accounts = db.collection<Account>("users");
    await accounts.createIndex({ email: 1 }, { unique: true });
    let account = await accounts.findOne({ email });

    if (account) {
      const submittedHash = Buffer.from(await hashPassword(password, account.passwordSalt), "hex");
      const storedHash = Buffer.from(account.passwordHash, "hex");
      if (submittedHash.length !== storedHash.length || !timingSafeEqual(submittedHash, storedHash)) {
        return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
      }
    } else {
      if (!name) {
        return Response.json({ error: "Account not found. Enter your name to create an account." }, { status: 404 });
      }
      const passwordSalt = randomBytes(16).toString("hex");
      account = {
        name,
        email,
        passwordSalt,
        passwordHash: await hashPassword(password, passwordSalt),
      };
      await accounts.insertOne(account);
    }

    return Response.json(
      { name: account.name, email: account.email },
      { headers: { "Set-Cookie": createSessionCookie(account.name, account.email) } },
    );
  } catch (error) {
    console.error("Sign-in failed:", error);
    return Response.json({ error: "Could not sign in right now. Please try again." }, { status: 500 });
  }
}
