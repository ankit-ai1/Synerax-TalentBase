import { Loader2 } from "lucide-react";
import { EmptyState } from "@/components/portal-ui/kit";

/** Shown when a verified candidate's profile couldn't be loaded / created */
export function ProfileMissing() {
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
