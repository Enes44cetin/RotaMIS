import Link from "next/link";
import { redirect } from "next/navigation";
import { Shield, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingCatalog, getExistingDraftAssessment } from "@/actions/onboarding";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Fetch profile, catalog, and existing draft in parallel
  const [{ data: profile }, catalog, existingDraft] = await Promise.all([
    supabase
      .from("profiles")
      .select("role, university_id, university_other, target_career_path_id")
      .eq("id", user.id)
      .maybeSingle(),
    getOnboardingCatalog(),
    getExistingDraftAssessment(user.id),
  ]);

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      {profile?.role === "admin" && (
        <div className="bg-[#0B1F4D] text-white px-4 py-2.5 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-300 shrink-0" />
            <span>
              Yönetici hesabıyla Öğrenci Check-Up ekranını önizliyorsunuz.
            </span>
          </div>
          <Link
            href="/admin"
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold transition-colors shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Admin Konsoluna Dön</span>
          </Link>
        </div>
      )}
      <OnboardingWizard
        universities={catalog.universities}
        careerPaths={catalog.careerPaths}
        skills={catalog.skills}
        initialDraft={existingDraft}
        initialUniversityId={profile?.university_id}
        initialUniversityOther={profile?.university_other}
        initialCareerPathId={profile?.target_career_path_id}
      />
    </div>
  );
}
