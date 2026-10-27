import { Metadata } from "next";
import { requireAdmin } from "@/lib/auth/require-admin";
import { AdminShell } from "@/components/admin/shell/admin-shell";

export const metadata: Metadata = {
  title: "Admin Konsolu — RotaMIS",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = await requireAdmin();

  return (
    <AdminShell adminEmail={profile.email} adminName={profile.full_name}>
      {children}
    </AdminShell>
  );
}
