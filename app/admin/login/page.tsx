import { AdminLoginForm } from "../../components/admin-login-form";
import { QuizFrame } from "../../components/quiz-frame";

export default function AdminLoginPage() {
  return (
    <QuizFrame title="Administrator access" description="Sign in to the Brightside admin area.">
      <AdminLoginForm />
    </QuizFrame>
  );
}
