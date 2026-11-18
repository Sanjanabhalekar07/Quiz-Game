import { CategoryStep } from "../components/category-step";
import { QuizFrame } from "../components/quiz-frame";

export default function CategoriesPage() {
  return (
    <QuizFrame
      step={2}
      title="Choose your curiosity."
      description="Every round is a fresh chance to learn something new."
    >
      <CategoryStep />
    </QuizFrame>
  );
}
