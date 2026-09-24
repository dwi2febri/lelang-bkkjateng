import { redirect } from "next/navigation";
import { getAdmin } from "@/lib/auth";
import { LoginForm } from "@/features/auth/components/login-form";
import "../admin.css";
export default async function LoginPage() {
  if (await getAdmin()) redirect("/dashboard");
  return <LoginForm />;
}
