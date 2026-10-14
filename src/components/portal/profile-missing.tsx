import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/portal-ui/kit";
import { createAdminClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth";
import { CandidateRegistrationForm } from "@/components/candidate/registration-form";

/**
 * Shown when a signed-in candidate has no profile.
 * Usually the registration was interrupted before the form + CV were saved (e.g. the verification email failed):
 * then they finish it here, signed in. If something is pending, the portal is still creating it.
 */
export async function ProfileMissing() {
  const profile = await getCurrentProfile();
  const admin = createAdminClient();
  const { data: res } = profile ? await admin.auth.admin.getUserById(profile.id) : { data: null };
  const pending = !!res?.user?.app_metadata?.pending_registration;

  if (profile && !pending) {
    const { data } = await admin.from("skills").select("name").order("name").limit(1000);
    return (
      <div className="mx-auto mt-6 max-w-3xl">
        <div className="portal-card p-5 sm:p-8">
          <h1 className="text-[22px] font-semibold text-ink-900">Finish your registration</h1>
          <p className="mt-1.5 text-[14px] text-ink-500">
            Your account is ready, but we didn't get your profile details. Upload your CV and check the details — it takes two minutes.
          </p>
          <div className="mt-6">
            <CandidateRegistrationForm skills={(data ?? []).map((s) => s.name as string)} account={{ userId: profile.id, email: profile.email, fullName: profile.full_name || undefined }} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-10 max-w-lg">
      <EmptyState
        icon={Loader2}
        title="We're setting up your profile"
        text="This usually takes a moment — try refreshing the page. If it still doesn't appear, please contact Synerax."
        action={{ href: "/contact", label: "Contact Synerax" }}
      />
    </div>
  );
}
