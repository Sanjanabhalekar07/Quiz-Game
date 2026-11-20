import { QuizFrame } from "../components/quiz-frame";
import { QuizStep } from "../components/quiz-step";

export default function QuizPage() {
  return (
    <QuizFrame
      title="Let’s see what you know."
      description="Ten questions, a little friendly pressure, and plenty to discover."
    >
      <QuizStep />
    </QuizFrame>
  );
}
