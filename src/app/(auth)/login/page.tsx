import { LoginForm } from "@/components/auth/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirectTo?: string; message?: string }>;
}) {
  const { redirectTo, message } = await searchParams;
  return <LoginForm redirectTo={redirectTo} message={message} />;
}
