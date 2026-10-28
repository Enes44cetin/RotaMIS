"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type AuthActionState } from "@/actions/auth";
import { LogIn, Mail, Lock, AlertCircle, Loader2 } from "lucide-react";

const initialState: AuthActionState = { error: null };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(loginAction, initialState);

  return (
    <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-xl shadow-slate-200/50">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-[#0B1F4D] tracking-tight">
          Tekrar Hoş Geldin 👋
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Kariyer yol haritana ve görevlerine devam etmek için giriş yap.
        </p>
      </div>

      {state?.error && (
        <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200/80 text-red-700 text-xs font-medium flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
          <span>{state.error}</span>
        </div>
      )}

      <form action={formAction} className="space-y-4">
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
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-[#2F5BFF] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Şifre
            </label>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="password"
              name="password"
              required
              placeholder="••••••••"
              className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-600/30 focus:border-[#2F5BFF] transition-all placeholder:text-slate-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 bg-[#2F5BFF] hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl shadow-md shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.99]"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Giriş Yapılıyor...</span>
            </>
          ) : (
            <>
              <LogIn className="w-4 h-4" />
              <span>Giriş Yap</span>
            </>
          )}
        </button>
      </form>

      <div className="mt-8 pt-6 border-t border-slate-100 text-center">
        <p className="text-sm text-slate-600">
          Henüz hesabın yok mu?{" "}
          <Link
            href="/register"
            className="font-bold text-[#2F5BFF] hover:text-blue-700 transition-colors"
          >
            Hemen Kaydol
          </Link>
        </p>
      </div>
    </div>
  );
}
