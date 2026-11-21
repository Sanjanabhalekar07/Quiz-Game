import mongoose, { Schema, type InferSchemaType } from "mongoose";

const scoreSchema = new Schema(
  {
    user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: { type: String, required: true, maxlength: 80 },
    score: { type: Number, required: true, min: 0, max: 10, validate: Number.isInteger },
    playedAt: { type: Number, required: true },
  },
  { collection: "scores", versionKey: false },
);

scoreSchema.index({ score: -1, playedAt: -1 });
scoreSchema.index({ user_id: 1, playedAt: -1 });

export type ScoreRecord = InferSchemaType<typeof scoreSchema>;

const Score = mongoose.models.Score || mongoose.model("Score", scoreSchema);
export default Score;
