import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import AuthForm from "@/components/AuthForm";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  if (getSessionUser()) redirect("/");
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <AuthForm />
    </main>
  );
}
