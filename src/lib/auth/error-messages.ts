/**
 * Supabase Auth veya sunucu kaynaklı İngilizce teknik hata mesajlarını
 * kullanıcı dostu, doğal Türkçe mesajlara çevirir.
 */
export function translateAuthError(
  rawMessage: string | null | undefined,
  fallback = "İşlem sırasında bir hata oluştu. Lütfen tekrar deneyin."
): string {
  if (!rawMessage) return fallback;
  const msg = rawMessage.toLowerCase();

  if (msg.includes("invalid login credentials")) {
    return "E-posta veya şifre hatalı.";
  }
  if (msg.includes("email not confirmed")) {
    return "E-posta adresiniz henüz doğrulanmamış. Lütfen gelen kutunuzdaki doğrulama bağlantısını onaylayın.";
  }
  if (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("unique")
  ) {
    return "Bu e-posta adresi ile kayıtlı bir hesap zaten var. Lütfen giriş yapın.";
  }
  if (
    msg.includes("only request this after") ||
    msg.includes("rate limit") ||
    msg.includes("too many requests") ||
    msg.includes("over_email_send_rate_limit")
  ) {
    return "Çok sık istek gönderdiniz. Güvenliğiniz için lütfen bir dakika bekleyip tekrar deneyin.";
  }
  if (
    msg.includes("different from the old password") ||
    msg.includes("same password")
  ) {
    return "Yeni şifreniz mevcut şifrenizden farklı olmalıdır.";
  }
  if (
    msg.includes("password should be at least") ||
    msg.includes("weak password")
  ) {
    return "Şifreniz en az 6 karakter uzunluğunda olmalıdır.";
  }
  if (
    msg.includes("expired") ||
    msg.includes("invalid token") ||
    msg.includes("otp") ||
    msg.includes("auth session missing")
  ) {
    return "Bağlantının süresi dolmuş veya geçersiz. Lütfen yeni bir şifre sıfırlama bağlantısı isteyin.";
  }
  if (msg.includes("invalid email") || msg.includes("unable to validate email")) {
    return "Lütfen geçerli bir e-posta adresi girin.";
  }

  return fallback;
}

/**
 * Open-redirect ve CRLF saldırılarına karşı `next` parametresini doğrular.
 * Yalnızca kontrol karakteri içermeyen, aynı origin'de çözümlenen göreli yollara izin verir.
 */
export function sanitizeRelativeNextPath(
  rawNext: string | null | undefined,
  defaultPath = "/dashboard"
): string {
  if (!rawNext) return defaultPath;
  const trimmed = rawNext.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("://") ||
    /[\u0000-\u001f\u007f]/.test(trimmed)
  ) {
    return defaultPath;
  }

  try {
    const resolved = new URL(trimmed, "https://rotamis.local");
    if (resolved.origin !== "https://rotamis.local") {
      return defaultPath;
    }
    return resolved.pathname + resolved.search + resolved.hash;
  } catch {
    return defaultPath;
  }
}

/**
 * Auth callback yönlendirmeleri için güvenli origin hesaplar.
 * Önce `NEXT_PUBLIC_SITE_URL` kullanılır; yoksa prod'da ilk geçerli `x-forwarded-host` token'ı doğrulanır.
 */
export function resolveSafeCallbackOrigin(
  requestOrigin: string,
  forwardedHostHeader: string | null | undefined,
  configuredSiteUrl: string | null | undefined,
  isDev: boolean
): string {
  const configured = configuredSiteUrl?.trim();
  if (configured && /^https?:\/\//i.test(configured)) {
    try {
      return new URL(configured).origin;
    } catch {
      // fall through
    }
  }

  if (!isDev && forwardedHostHeader) {
    const firstHost = forwardedHostHeader.split(",")[0]?.trim() || "";
    if (/^[a-z0-9.-]+(?::\d{1,5})?$/i.test(firstHost)) {
      return `https://${firstHost}`;
    }
  }

  return requestOrigin;
}
