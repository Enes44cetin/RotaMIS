import { cache } from "react";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export interface AdminSession {
  user: {
    id: string;
    email?: string;
  };
  profile: {
    id: string;
    email: string;
    full_name: string | null;
    role: "student" | "admin";
  };
}

/**
 * Server-side guard to guarantee only users with role = 'admin'
 * can access admin Server Components and Server Actions.
 * Wrapped with React cache() to memoize result across the entire request lifecycle.
 */
export const requireAdmin = cache(async (): Promise<AdminSession> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/admin");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin") {
    // Return 404 to avoid exposing admin route existence to regular users
    notFound();
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    profile,
  };
});
