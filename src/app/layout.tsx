import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "RotaMIS — YBS Öğrencileri İçin Akıllı Kariyer Rotası",
  description:
    "Okulda öğrendiklerin sektörde ne kadar geçerli? 5 dakikalık check-up ile yetkinliklerini test et, sektör beklentisiyle arandaki farkı radar analiziyle gör.",
  keywords: [
    "YBS",
    "Yönetim Bilişim Sistemleri",
    "RotaMIS",
    "Kariyer Rotası",
    "İş Analisti",
    "Veri Analisti",
    "ERP Danışmanı",
    "Beceriler",
  ],
  authors: [{ name: "Düzce Üniversitesi YBS Öğrencileri" }],
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "RotaMIS",
    title: "RotaMIS — YBS Öğrencileri İçin Akıllı Kariyer Rotası",
    description:
      "Okulda öğrendiklerin sektörde ne kadar geçerli? 5 dakikalık check-up ile yetkinliklerini test et, sektörle arandaki farkı gör.",
  },
  twitter: {
    card: "summary_large_image",
    title: "RotaMIS — YBS Öğrencileri İçin Akıllı Kariyer Rotası",
    description:
      "Okulda öğrendiklerin sektörde ne kadar geçerli? 5 dakikalık check-up ile yetkinliklerini test et, sektörle arandaki farkı gör.",
  },
};

export const viewport: Viewport = {
  themeColor: "#0B1F4D",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" className={jakarta.variable}>
      <body className="font-sans antialiased bg-[#F7F9FC] text-slate-900 selection:bg-blue-600 selection:text-white">
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
