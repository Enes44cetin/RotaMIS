import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOnboardingCatalog, getExistingDraftAssessment } from "@/actions/onboarding";
import { OnboardingWizard } from "@/components/onboarding/wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check if profile exists and if onboarding is already completed
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_completed, university_id, university_other")
    .eq("id", user.id)
    .single();

  const [catalog, existingDraft] = await Promise.all([
    getOnboardingCatalog(),
    getExistingDraftAssessment(),
  ]);

  return (
    <div className="min-h-screen bg-[#F7F9FC]">
      <OnboardingWizard
        universities={catalog.universities}
        careerPaths={catalog.careerPaths}
        skills={catalog.skills}
        initialDraft={existingDraft}
      />
    </div>
  );
}
