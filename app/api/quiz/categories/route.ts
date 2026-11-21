import connectToDatabase from "../../../../lib/mongoose";
import Category from "../../../../models/Category";

export async function GET() {
  try {
    await connectToDatabase();
    const categories = await Category.find({})
      .select("name icon description")
      .sort({ name: 1 })
      .lean();
    return Response.json({ categories });
  } catch (error) {
    console.error("Could not load quiz categories:", error);
    return Response.json({ error: "Could not load categories." }, { status: 503 });
  }
}
