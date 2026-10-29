import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string;
    reason?: string;
    switch?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const redirectTo =
    params.redirect &&
    params.redirect.startsWith("/") &&
    !params.redirect.startsWith("//")
      ? params.redirect
      : undefined;
  const isNotAdminRedirect = params.reason === "not_admin";

  let currentSignedInEmail: string | null = null;
  if (isNotAdminRedirect || params.switch === "1") {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    currentSignedInEmail = user?.email ?? null;
  }

  return (
    <LoginForm
      redirectTo={redirectTo}
      isNotAdminRedirect={isNotAdminRedirect}
      currentSignedInEmail={currentSignedInEmail}
    />
  );
}
