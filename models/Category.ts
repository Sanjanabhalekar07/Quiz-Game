import mongoose, { Schema, type InferSchemaType } from "mongoose";

const categorySchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true, maxlength: 80 },
    icon: { type: String, required: true, maxlength: 16 },
    description: { type: String, required: true, maxlength: 200 },
  },
  { collection: "categories", versionKey: false },
);

export type CategoryRecord = InferSchemaType<typeof categorySchema>;

const Category = mongoose.models.Category || mongoose.model("Category", categorySchema);
export default Category;
