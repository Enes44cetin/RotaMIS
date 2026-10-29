"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { loginSchema, registerSchema } from "@/lib/validation/student-schemas";

export interface AuthActionState {
  error?: string | null;
}

function extractFormData(
  arg1: AuthActionState | FormData | null | undefined,
  arg2?: FormData
): FormData {
  if (arg1 instanceof FormData) return arg1;
  if (arg2 instanceof FormData) return arg2;
  return new FormData();
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
    return { error: parsed.error.issues[0]?.message || "Lütfen e-posta ve şifrenizi girin." };
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
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return { error: "E-posta veya şifre hatalı." };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki doğrulama bağlantısını onaylayın.",
      };
    }
    return { error: error.message || "Giriş işlemi başarısız oldu." };
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
  const safeRedirect =
    typeof rawRedirect === "string" &&
    rawRedirect.startsWith("/") &&
    !rawRedirect.startsWith("//")
      ? rawRedirect
      : null;

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

  redirect(safeRedirect && !safeRedirect.startsWith("/admin") ? safeRedirect : "/dashboard");
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
    return { error: parsed.error.issues[0]?.message || "Lütfen tüm zorunlu alanları doldurun." };
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
      if (
        createError.message.toLowerCase().includes("already registered") ||
        createError.message.toLowerCase().includes("unique")
      ) {
        return {
          error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var. Lütfen giriş yapın.",
        };
      }
      return { error: createError.message || "Kayıt işlemi sırasında bir hata oluştu." };
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
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
        locale: "tr",
        kvkk_accepted: "true",
      },
    },
  });

  if (signUpError) {
    if (
      signUpError.message.toLowerCase().includes("already registered") ||
      signUpError.message.toLowerCase().includes("unique")
    ) {
      return {
        error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var. Lütfen giriş yapın.",
      };
    }
    return { error: signUpError.message || "Kayıt işlemi sırasında bir hata oluştu." };
  }

  // If session wasn't established automatically (e.g. email confirm disabled on server but session needs sign-in)
  if (!signUpData.session) {
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (signInError) {
      return {
        error:
          "Kaydınız alındı! Lütfen e-posta adresinize gönderilen doğrulama bağlantısını onaylayarak giriş yapın.",
      };
    }
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
