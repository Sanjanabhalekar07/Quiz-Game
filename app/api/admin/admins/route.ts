import mongoose from "mongoose";
import { randomBytes, scrypt as scryptCallback } from "node:crypto";
import { promisify } from "node:util";
import { createAdminSessionCookie, getAdminSession } from "../../../../lib/auth-session";
import { hasAdminAccess } from "../../../../lib/admin-access";
import Admin from "../../../../models/Admin";

const scrypt = promisify(scryptCallback);

export async function GET(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const admins = await Admin.find({}).select("name email createdAt").sort({ name: 1 }).lean();
    return Response.json({ admins }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Could not load admins:", error);
    return Response.json({ error: "Could not load admins." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const body = await request.json().catch(() => null) as {
      name?: unknown;
      email?: unknown;
      password?: unknown;
    } | null;
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (!name || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 || password.length < 8 || password.length > 128) {
      return Response.json({ error: "Enter a valid name, email, and password between 8 and 128 characters." }, { status: 400 });
    }
    const passwordSalt = randomBytes(16).toString("hex");
    const passwordHash = ((await scrypt(password, passwordSalt, 64)) as Buffer).toString("hex");
    const admin = await Admin.create({ name, email, passwordSalt, passwordHash });
    return Response.json({ admin: { _id: admin._id, name: admin.name, email: admin.email, createdAt: admin.createdAt } }, { status: 201 });
  } catch (error) {
    if (isDuplicate(error)) return Response.json({ error: "An admin with that email already exists." }, { status: 409 });
    console.error("Could not create admin:", error);
    return Response.json({ error: "Could not create admin." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const body = await request.json().catch(() => null) as {
      id?: unknown;
      name?: unknown;
      email?: unknown;
      password?: unknown;
    } | null;
    const id = typeof body?.id === "string" ? body.id.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (
      !mongoose.isValidObjectId(id) || !name || name.length > 80 ||
      !/^\S+@\S+\.\S+$/.test(email) || email.length > 254 ||
      (password.length > 0 && (password.length < 8 || password.length > 128))
    ) {
      return Response.json({ error: "Enter a valid name and email. A new password must be 8–128 characters." }, { status: 400 });
    }
    const update: { name: string; email: string; passwordSalt?: string; passwordHash?: string } = { name, email };
    if (password) {
      update.passwordSalt = randomBytes(16).toString("hex");
      update.passwordHash = ((await scrypt(password, update.passwordSalt, 64)) as Buffer).toString("hex");
    }
    const admin = await Admin.findByIdAndUpdate(id, update, { new: true, runValidators: true })
      .select("name email createdAt")
      .lean();
    if (!admin) return Response.json({ error: "Admin not found." }, { status: 404 });

    const session = getAdminSession(request);
    const headers = session?.userId === id
      ? { "Set-Cookie": createAdminSessionCookie(id, admin.name, admin.email) }
      : undefined;
    return Response.json({ admin }, headers ? { headers } : undefined);
  } catch (error) {
    if (isDuplicate(error)) return Response.json({ error: "An admin with that email already exists." }, { status: 409 });
    console.error("Could not update admin:", error);
    return Response.json({ error: "Could not update admin." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id")?.trim() ?? "";
    if (!mongoose.isValidObjectId(id)) return Response.json({ error: "Enter a valid admin ID." }, { status: 400 });
    const session = getAdminSession(request);
    if (session?.userId === id) return Response.json({ error: "You cannot delete the admin account you are using." }, { status: 409 });
    const admin = await Admin.findByIdAndDelete(id);
    if (!admin) return Response.json({ error: "Admin not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Could not delete admin:", error);
    return Response.json({ error: "Could not delete admin." }, { status: 500 });
  }
}

function isDuplicate(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}
