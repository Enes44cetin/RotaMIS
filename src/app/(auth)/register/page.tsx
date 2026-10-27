"use client";

import { useState } from "react";
import Link from "next/link";
import { registerAction } from "@/actions/auth";
import { UserPlus, Mail, Lock, User, AlertCircle, Loader2, CheckSquare } from "lucide-react";

export default function RegisterPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const result = await registerAction(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
  }

  return (
    <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4D] tracking-tight">
          Hesap Oluştur 🚀
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          5 dakikalık beceri check-up'ı ve AI yol haritan için hemen kaydol.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Ad Soyad
          </label>
          <div className="relative">
            <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              name="fullName"
              required
              placeholder="Ahmet Yılmaz"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            E-posta Adresi
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              name="email"
              required
              placeholder="ornek@universite.edu.tr"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
            Şifre (En az 6 karakter)
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              name="password"
              required
              minLength={6}
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-blue-600 transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* KVKK Consent */}
        <div className="pt-2">
          <label className="flex items-start gap-2.5 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              name="kvkk"
              required
              className="mt-0.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            <span>
              <strong className="text-slate-800">KVKK Aydınlatma Metni</strong>'ni okudum, kişisel kariyer ve beceri verilerimin yol haritası oluşturulması amacıyla işlenmesini onaylıyorum.
            </span>
          </label>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#2563EB] hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Kaydediliyor...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Kayıt Ol ve Başla</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-600">
          Zaten bir hesabın var mı?{" "}
          <Link
            href="/login"
            className="font-bold text-blue-600 hover:text-blue-700 transition-colors"
          >
            Giriş Yap
          </Link>
        </p>
      </div>
    </div>
  );
}
