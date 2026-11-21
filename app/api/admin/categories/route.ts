import { hasAdminAccess } from "../../../../lib/admin-access";
import connectToDatabase from "../../../../lib/mongoose";
import Category from "../../../../models/Category";
import Question from "../../../../models/Question";

function categoryInput(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const input = value as { name?: unknown; icon?: unknown; description?: unknown };
  const name = typeof input.name === "string" ? input.name.trim() : "";
  const icon = typeof input.icon === "string" ? input.icon.trim() : "";
  const description = typeof input.description === "string" ? input.description.trim() : "";
  if (!name || name.length > 80 || !icon || icon.length > 16 || !description || description.length > 200) return null;
  return { name, icon, description };
}

export async function GET(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const categories = await Category.find({}).select("name icon description").sort({ name: 1 }).lean();
    return Response.json({ categories }, { headers: { "Cache-Control": "no-store, private" } });
  } catch (error) {
    console.error("Could not load managed categories:", error);
    return Response.json({ error: "Could not load categories." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const input = categoryInput(await request.json().catch(() => null));
    if (!input) return Response.json({ error: "Enter a name, icon, and description within the allowed lengths." }, { status: 400 });
    const category = await Category.create(input);
    return Response.json({ category: { _id: category._id, ...input } }, { status: 201 });
  } catch (error) {
    if (isDuplicate(error)) return Response.json({ error: "A category with that name already exists." }, { status: 409 });
    console.error("Could not create category:", error);
    return Response.json({ error: "Could not create category." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const body = await request.json().catch(() => null) as { id?: unknown; category?: unknown } | null;
    const id = typeof body?.id === "string" ? body.id : "";
    const input = categoryInput(body?.category);
    if (!id || !/^[\da-f]{24}$/i.test(id) || !input) {
      return Response.json({ error: "Enter a valid category and category ID." }, { status: 400 });
    }
    const category = await Category.findByIdAndUpdate(id, input, { new: true, runValidators: true })
      .select("name icon description")
      .lean();
    if (!category) return Response.json({ error: "Category not found." }, { status: 404 });
    return Response.json({ category });
  } catch (error) {
    if (isDuplicate(error)) return Response.json({ error: "A category with that name already exists." }, { status: 409 });
    console.error("Could not update category:", error);
    return Response.json({ error: "Could not update category." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await hasAdminAccess(request))) return Response.json({ error: "Admin sign-in is required." }, { status: 401 });
    const id = new URL(request.url).searchParams.get("id") ?? "";
    if (!/^[\da-f]{24}$/i.test(id)) return Response.json({ error: "Enter a valid category ID." }, { status: 400 });
    if (await Question.exists({ category: id })) {
      return Response.json({ error: "Delete or move this category's questions first." }, { status: 409 });
    }
    const category = await Category.findByIdAndDelete(id);
    if (!category) return Response.json({ error: "Category not found." }, { status: 404 });
    return Response.json({ ok: true });
  } catch (error) {
    console.error("Could not delete category:", error);
    return Response.json({ error: "Could not delete category." }, { status: 500 });
  }
}

function isDuplicate(error: unknown) {
  return Boolean(error && typeof error === "object" && "code" in error && error.code === 11000);
}
