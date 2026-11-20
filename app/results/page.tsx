import { QuizFrame } from "../components/quiz-frame";
import { ResultsStep } from "../components/results-step";

export default function ResultsPage() {
  return (
    <QuizFrame
      title="Curiosity looks good on you."
      description="See how your round went, then choose what to explore next."
    >
      <ResultsStep />
    </QuizFrame>
  );
}
