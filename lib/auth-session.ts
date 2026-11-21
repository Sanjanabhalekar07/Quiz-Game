import { createHmac, timingSafeEqual } from "node:crypto";

export type AuthSession = {
  userId: string;
  name: string;
  email: string;
  expiresAt: number;
};

export function createSessionCookie(userId: string, name: string, email: string): string {
  return createSignedSessionCookie("brightside_session", userId, name, email);
}

export function createAdminSessionCookie(adminId: string, name: string, email: string): string {
  return createSignedSessionCookie("brightside_admin_session", adminId, name, email);
}

function createSignedSessionCookie(cookieName: string, userId: string, name: string, email: string): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is not configured.");

  const maxAge = 60 * 60 * 24 * 7;
  const expiresAt = Math.floor(Date.now() / 1000) + maxAge;
  const payload = Buffer.from(JSON.stringify({ userId, name, email, expiresAt })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return `${cookieName}=${payload}.${signature}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${maxAge}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}

export function getAuthSession(request: Request): AuthSession | null {
  return getSignedSession(request, "brightside_session");
}

export function getAdminSession(request: Request): AuthSession | null {
  return getSignedSession(request, "brightside_admin_session");
}

function getSignedSession(request: Request, cookieName: string): AuthSession | null {
  const secret = process.env.SESSION_SECRET;
  if (!secret) return null;

  const cookieHeader = request.headers.get("cookie") ?? "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`))
    ?.slice(`${cookieName}=`.length);
  if (!cookie) return null;

  const [payload, signature] = cookie.split(".");
  if (!payload || !signature) return null;

  const expected = createHmac("sha256", secret).update(payload).digest();
  let received: Buffer;
  try {
    received = Buffer.from(signature, "base64url");
  } catch {
    return null;
  }
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Partial<AuthSession>;
    if (
      typeof session.userId !== "string" || !/^[\da-f]{24}$/i.test(session.userId) ||
      typeof session.name !== "string" ||
      typeof session.email !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }
    return session as AuthSession;
  } catch {
    return null;
  }
}

export function clearAdminSessionCookie() {
  return `brightside_admin_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${process.env.NODE_ENV === "production" ? "; Secure" : ""}`;
}
