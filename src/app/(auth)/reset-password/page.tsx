import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, ArrowRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

export const metadata: Metadata = {
  title: "Yeni Şifre Belirle — RotaMIS",
};

export default async function ResetPasswordPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50 text-center space-y-5">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7" />
        </div>
        <div className="space-y-1.5">
          <h1 className="text-xl font-extrabold text-[#0B1F4D]">
            Sıfırlama Bağlantısı Geçersiz veya Süresi Dolmuş
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
            Şifre sıfırlama bağlantıları tek kullanımlıktır ve belirli bir süre
            sonra geçerliliğini yitirir. Aşağıdan yeni bir bağlantı isteyebilirsin.
          </p>
        </div>
        <Link
          href="/forgot-password"
          className="w-full inline-flex items-center justify-center gap-2 bg-[#2F5BFF] hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-blue-500/25 transition-all"
        >
          <span>Yeni Sıfırlama Bağlantısı İste</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    );
  }

  return <ResetPasswordForm />;
}
