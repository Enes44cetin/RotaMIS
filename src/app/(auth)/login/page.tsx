import { createClient } from "@/lib/supabase/server";
import { LoginForm } from "@/components/auth/login-form";
import { sanitizeRelativeNextPath } from "@/lib/auth/error-messages";

interface LoginPageProps {
  searchParams: Promise<{
    redirect?: string;
    reason?: string;
    switch?: string;
    reset?: string;
    error?: string;
  }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const sanitized = sanitizeRelativeNextPath(params.redirect, "");
  const redirectTo = sanitized || undefined;
  const isNotAdminRedirect = params.reason === "not_admin";
  const resetSuccess = params.reset === "1";
  const linkError = params.error === "link_expired";

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
      resetSuccess={resetSuccess}
      linkError={linkError}
    />
  );
}
