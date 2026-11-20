import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import {
  resolveSafeCallbackOrigin,
  sanitizeRelativeNextPath,
} from "@/lib/auth/error-messages";

function buildRedirectUrl(request: NextRequest, path: string): string {
  const { origin } = new URL(request.url);
  const safeOrigin = resolveSafeCallbackOrigin(
    origin,
    request.headers.get("x-forwarded-host"),
    process.env.NEXT_PUBLIC_SITE_URL,
    process.env.NODE_ENV === "development"
  );
  return `${safeOrigin}${path}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const nextPath = sanitizeRelativeNextPath(searchParams.get("next"), "/dashboard");

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(buildRedirectUrl(request, nextPath));
    }
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });
    if (!error) {
      return NextResponse.redirect(buildRedirectUrl(request, nextPath));
    }
  }

  return NextResponse.redirect(
    buildRedirectUrl(request, "/login?error=link_expired")
  );
}
