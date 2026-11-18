import { QuizFrame } from "./components/quiz-frame";
import { WelcomeStep } from "./components/welcome-step";

export default function WelcomePage() {
  return (
    <QuizFrame
      step={1}
      title={<>Good things come<br />to curious minds.</>}
      description="Take a moment, pick a topic, and see what you know."
    >
      <WelcomeStep />
    </QuizFrame>
  );
}
