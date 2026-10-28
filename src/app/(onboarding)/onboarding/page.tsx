import { redirect } from "next/navigation";
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
      .select("university_id, university_other, target_career_path_id")
      .eq("id", user.id)
      .maybeSingle(),
    getOnboardingCatalog(),
    getExistingDraftAssessment(user.id),
  ]);

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
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
