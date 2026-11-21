import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline/promises";
import mongoose, { Schema } from "mongoose";

const uri = process.env.MONGODB_URI;
if (!uri) {
  console.error("Set MONGODB_URI before creating an admin account.");
  process.exit(1);
}

const prompt = createInterface({ input: process.stdin, output: process.stdout });
try {
  const name = (await prompt.question("Admin name: ")).trim();
  const email = (await prompt.question("Admin email: ")).trim().toLowerCase();
  const password = await prompt.question("Admin password (8-128 characters): ");
  if (!name || name.length > 80 || !/^\S+@\S+\.\S+$/.test(email) || password.length < 8 || password.length > 128) {
    throw new Error("Enter a valid name, email, and password.");
  }

  await mongoose.connect(uri, { dbName: process.env.MONGODB_DB ?? "brightside-quiz" });
  const schema = new Schema(
    {
      name: { type: String, required: true, trim: true, maxlength: 80 },
      email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 254 },
      passwordHash: { type: String, required: true },
      passwordSalt: { type: String, required: true },
    },
    { collection: "admins", timestamps: true },
  );
  const Admin = mongoose.models.Admin || mongoose.model("Admin", schema);
  const passwordSalt = randomBytes(16).toString("hex");
  await Admin.create({
    name,
    email,
    passwordSalt,
    passwordHash: scryptSync(password, passwordSalt, 64).toString("hex"),
  });
  console.log(`Admin account created for ${email}.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : "Could not create admin account.");
  process.exitCode = 1;
} finally {
  prompt.close();
  await mongoose.disconnect();
}
