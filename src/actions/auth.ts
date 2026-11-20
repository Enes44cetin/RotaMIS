"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "@/lib/validation/student-schemas";
import {
  sanitizeRelativeNextPath,
  translateAuthError,
} from "@/lib/auth/error-messages";

export interface AuthActionState {
  error?: string | null;
  success?: string | null;
}

function extractFormData(
  arg1: AuthActionState | FormData | null | undefined,
  arg2?: FormData
): FormData {
  if (arg1 instanceof FormData) return arg1;
  if (arg2 instanceof FormData) return arg2;
  return new FormData();
}

async function resolveSiteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    return configured.replace(/\/+$/, "");
  }

  const hdrs = await headers();
  const forwardedHost = hdrs.get("x-forwarded-host") || hdrs.get("host");
  const proto =
    hdrs.get("x-forwarded-proto") ||
    (process.env.NODE_ENV === "development" ? "http" : "https");

  if (forwardedHost) {
    return `${proto}://${forwardedHost}`.replace(/\/+$/, "");
  }

  return "http://localhost:3000";
}

export async function loginAction(
  prevStateOrFormData: AuthActionState | FormData | null | undefined,
  maybeFormData?: FormData
): Promise<AuthActionState> {
  const formData = extractFormData(prevStateOrFormData, maybeFormData);

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Lütfen e-posta ve şifrenizi girin.",
    };
  }

  const { email, password } = parsed.data;
  const supabase = await createClient();

  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // Development-only convenience: auto-confirm if local dev project has "Confirm email" enabled
  if (
    process.env.NODE_ENV === "development" &&
    error &&
    error.message.toLowerCase().includes("email not confirmed")
  ) {
    try {
      const adminClient = createAdminClient();
      const { data: profileRow } = await adminClient
        .from("profiles")
        .select("id")
        .ilike("email", email)
        .maybeSingle();

      if (profileRow?.id) {
        await adminClient.auth.admin.updateUserById(profileRow.id, {
          email_confirm: true,
        });
        const retry = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        data = retry.data;
        error = retry.error;
      }
    } catch (adminErr) {
      console.warn("Dev auto-confirm during login failed:", adminErr);
    }
  }

  if (error) {
    return {
      error: translateAuthError(error.message, "Giriş işlemi başarısız oldu."),
    };
  }

  if (!data?.user) {
    return { error: "Kullanıcı bilgisi alınamadı." };
  }

  // Check user profile for smart routing
  const { data: profile } = await supabase
    .from("profiles")
    .select("role, onboarding_completed")
    .eq("id", data.user.id)
    .single();

  const rawRedirect = formData.get("redirectTo");
  const sanitizedRedirect =
    typeof rawRedirect === "string"
      ? sanitizeRelativeNextPath(rawRedirect, "")
      : "";
  const safeRedirect = sanitizedRedirect || null;

  if (safeRedirect?.startsWith("/admin") && profile?.role !== "admin") {
    return {
      error: `Giriş yapılan "${email}" hesabı Öğrenci rolündedir ve Admin Konsolu yetkisi yoktur. Lütfen yönetici e-posta adresinizle giriş yapın.`,
    };
  }

  if (profile?.role === "admin") {
    redirect(safeRedirect?.startsWith("/admin") ? safeRedirect : "/admin");
  }

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  redirect(
    safeRedirect && !safeRedirect.startsWith("/admin") ? safeRedirect : "/dashboard"
  );
}

export async function registerAction(
  prevStateOrFormData: AuthActionState | FormData | null | undefined,
  maybeFormData?: FormData
): Promise<AuthActionState> {
  const formData = extractFormData(prevStateOrFormData, maybeFormData);

  const parsed = registerSchema.safeParse({
    fullName: formData.get("fullName"),
    email: formData.get("email"),
    password: formData.get("password"),
    kvkk: formData.get("kvkk") === "on",
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Lütfen tüm zorunlu alanları doldurun.",
    };
  }

  const { email, password, fullName } = parsed.data;
  const supabase = await createClient();

  if (process.env.NODE_ENV === "development") {
    // In development, bypass Supabase's strict 2-3 emails/hour rate limit via adminClient
    const adminClient = createAdminClient();
    const { error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        locale: "tr",
        kvkk_accepted: "true",
      },
    });

    if (createError) {
      return {
        error: translateAuthError(
          createError.message,
          "Kayıt işlemi sırasında bir hata oluştu."
        ),
      };
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      return {
        error:
          "Hesabınız oluşturuldu ancak oturum açılamadı. Lütfen Giriş Yap sayfasını deneyin.",
      };
    }

    redirect("/onboarding");
  }

  // Standard Production flow via Supabase Auth
  const origin = await resolveSiteOrigin();
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=/onboarding`,
      data: {
        full_name: fullName,
        locale: "tr",
        kvkk_accepted: "true",
      },
    },
  });

  if (signUpError) {
    return {
      error: translateAuthError(
        signUpError.message,
        "Kayıt işlemi sırasında bir hata oluştu."
      ),
    };
  }

  // If session wasn't established automatically (e.g. email confirmation required on server)
  if (!signUpData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return {
        success:
          "Kaydınız alındı! E-posta adresinize gönderilen doğrulama bağlantısını onayladıktan sonra giriş yapabilirsiniz.",
      };
    }
  }

  redirect("/onboarding");
}

export async function requestPasswordResetAction(
  prevStateOrFormData: AuthActionState | FormData | null | undefined,
  maybeFormData?: FormData
): Promise<AuthActionState> {
  const formData = extractFormData(prevStateOrFormData, maybeFormData);

  const parsed = forgotPasswordSchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message || "Lütfen geçerli bir e-posta adresi girin.",
    };
  }

  const supabase = await createClient();
  const origin = await resolveSiteOrigin();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  });

  if (error) {
    const lower = error.message.toLowerCase();
    if (
      lower.includes("only request this after") ||
      lower.includes("rate limit") ||
      lower.includes("too many requests") ||
      lower.includes("over_email_send_rate_limit")
    ) {
      return { error: translateAuthError(error.message) };
    }
  }

  // Hesap tarama (enumeration) koruması için her durumda aynı nötr onay mesajı döner
  return {
    success:
      "Eğer bu e-posta adresiyle kayıtlı bir hesabın varsa, şifre sıfırlama bağlantısını gelen kutuna gönderdik.",
  };
}

export async function updatePasswordAction(
  prevStateOrFormData: AuthActionState | FormData | null | undefined,
  maybeFormData?: FormData
): Promise<AuthActionState> {
  const formData = extractFormData(prevStateOrFormData, maybeFormData);

  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message || "Lütfen geçerli bir yeni şifre belirleyin.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      error:
        "Şifre sıfırlama oturumun geçersiz veya süresi dolmuş. Lütfen yeni bir sıfırlama bağlantısı iste.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return {
      error: translateAuthError(error.message, "Şifren güncellenirken bir hata oluştu."),
    };
  }

  await supabase.auth.signOut();
  redirect("/login?reset=1");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
