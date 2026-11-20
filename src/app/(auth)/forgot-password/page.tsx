import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export const metadata: Metadata = {
  title: "Şifremi Unuttum — RotaMIS",
};

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm />;
}
