"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";

export async function loginAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Lütfen e-posta ve şifrenizi girin." };
  }

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // If Supabase returned "Email not confirmed", auto-confirm via adminClient and retry login
  if (error && error.message.toLowerCase().includes("email not confirmed")) {
    try {
      const adminClient = createAdminClient();
      const { data: usersData } = await adminClient.auth.admin.listUsers();
      const targetUser = usersData.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (targetUser) {
        await adminClient.auth.admin.updateUserById(targetUser.id, {
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
      console.warn("Auto-confirm during login failed:", adminErr);
    }
  }

  if (error) {
    if (error.message.toLowerCase().includes("invalid login credentials")) {
      return { error: "E-posta veya şifre hatalı." };
    }
    if (error.message.toLowerCase().includes("email not confirmed")) {
      return {
        error:
          "E-posta adresiniz henüz doğrulanmamış. Lütfen e-postanızı onaylayın veya Supabase panelinden 'Confirm email' ayarını kapatın.",
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

  if (profile?.role === "admin") {
    redirect("/admin");
  }

  if (!profile?.onboarding_completed) {
    redirect("/onboarding");
  }

  redirect("/dashboard");
}

export async function registerAction(formData: FormData) {
  const email = (formData.get("email") as string)?.trim();
  const password = formData.get("password") as string;
  const fullName = (formData.get("fullName") as string)?.trim();
  const kvkk = formData.get("kvkk") === "on";

  if (!email || !password || !fullName) {
    return { error: "Lütfen tüm zorunlu alanları doldurun." };
  }

  if (password.length < 6) {
    return { error: "Şifreniz en az 6 karakter olmalıdır." };
  }

  if (!kvkk) {
    return { error: "Devam etmek için KVKK ve Aydınlatma Metnini onaylamalısınız." };
  }

  // Use adminClient to create the user directly with email_confirm: true.
  // This completely bypasses Supabase's rate-limited default mailer (which limits to 2-3 emails/hour and throws "email rate limit exceeded").
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
      return { error: "Bu e-posta adresi ile kayıtlı bir hesap zaten var. Lütfen giriş yapın." };
    }
    return { error: createError.message || "Kayıt işlemi sırasında bir hata oluştu." };
  }

  // Immediately sign in so auth session cookies are stored in browser response
  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    return { error: "Hesabınız oluşturuldu ancak oturum açılamadı. Lütfen Giriş Yap sayfasını deneyin." };
  }

  redirect("/onboarding");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
