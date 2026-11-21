import mongoose, { Schema, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 40 },
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
  { collection: "users", timestamps: true },
);

export type UserRecord = InferSchemaType<typeof userSchema>;

const User = mongoose.models.User || mongoose.model("User", userSchema);
export default User;
