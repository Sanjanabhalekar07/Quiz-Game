import { QuizFrame } from "../components/quiz-frame";
import { ProfilePanel } from "../components/profile-panel";

export default function ProfilePage() {
  return (
    <QuizFrame title="Your profile" description="Update your account and look back at your games.">
      <ProfilePanel />
    </QuizFrame>
  );
}
