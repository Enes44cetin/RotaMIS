import { createClient } from "@/lib/supabase/server";
import { LandingNavbar } from "@/components/landing/landing-navbar";
import { HeroSection } from "@/components/landing/hero/hero-section";
import { HowItWorksSection } from "@/components/landing/how-it-works/how-it-works-section";
import { TestimonialsSection } from "@/components/landing/testimonials/testimonials-section";
import { FinalCta } from "@/components/landing/final-cta";
import { LandingFooter } from "@/components/landing/landing-footer";

export default async function HomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="min-h-screen flex flex-col bg-[#F7F9FC] text-slate-900 overflow-x-hidden">
      <LandingNavbar isLoggedIn={!!user} />
      <main className="flex-1">
        <HeroSection />
        <HowItWorksSection />
        <TestimonialsSection />
        <FinalCta />
      </main>
      <LandingFooter />
    </div>
  );
}
