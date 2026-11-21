import mongoose, { Schema, type InferSchemaType } from "mongoose";

const questionSchema = new Schema(
  {
    question: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    options: { type: [String], required: true, validate: (values: string[]) => values.length === 4 },
    answer: { type: String, required: true },
  },
  { collection: "questions", versionKey: false },
);

questionSchema.index({ category: 1, question: 1 }, { unique: true });

export type QuestionRecord = InferSchemaType<typeof questionSchema>;

const Question = mongoose.models.Question || mongoose.model("Question", questionSchema);
export default Question;
