import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { MyApplication } from "@/lib/portal-types";
import { ApplicationsList } from "./applications-list";

export const metadata = { title: "My applications" };

export default async function PortalApplicationsPage() {
  await requireRole("candidate");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("candidate_my_applications");
  const apps = (error ? [] : data ?? []) as MyApplication[];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-ink-900">My applications</h1>
        <p className="mt-1 text-[15px] text-ink-500">Track every role you&apos;ve applied for or been put forward for by Synerax.</p>
      </div>
      {apps.length ? (
        <ApplicationsList apps={apps} />
      ) : (
        <div className="rounded-3xl border border-dashed border-line-strong p-10 text-center">
          <p className="text-[15px] font-medium text-ink-800">No applications yet</p>
          <p className="mt-1 text-sm text-ink-500">Find a role that fits and apply in one click.</p>
          <Link href="/portal/jobs" className="mt-5 inline-flex h-11 items-center rounded-xl bg-jade px-5 text-[14.5px] font-semibold text-white hover:brightness-110">
            Find jobs
          </Link>
        </div>
      )}
    </div>
  );
}
