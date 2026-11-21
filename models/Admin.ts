import mongoose, { Schema, type InferSchemaType } from "mongoose";

const adminSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, required: true },
    passwordSalt: { type: String, required: true },
  },
  { collection: "admins", timestamps: true },
);

export type AdminRecord = InferSchemaType<typeof adminSchema>;

const Admin = mongoose.models.Admin || mongoose.model("Admin", adminSchema);
export default Admin;
