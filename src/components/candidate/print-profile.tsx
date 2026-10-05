"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/shell/sidebar";
import { APP_NAME } from "@/lib/constants";
import { formatDate, lpa, noticeLabel, todayIST, years } from "@/lib/utils";

/* eslint-disable @typescript-eslint/no-explicit-any */
export function PrintProfile({ c, preparedBy }: { c: any; preparedBy: string }) {
  const [showName, setShowName] = useState(true);
  const [showContact, setShowContact] = useState(false);
  const [showCtc, setShowCtc] = useState(true);
  const [showCompany, setShowCompany] = useState(true);
  const name = [c.first_name, c.middle_name, c.last_name].filter(Boolean).join(" ");
  const skills = (c.candidate_skills ?? []).filter((s: any) => s.skill).sort((a: any, b: any) => Number(b.is_primary) - Number(a.is_primary) || (b.years ?? 0) - (a.years ?? 0));

  return (
    <div className="min-h-screen bg-canvas py-8 print:bg-white print:py-0">
      <div className="no-print mx-auto mb-6 flex max-w-[820px] flex-wrap items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
        <p className="text-sm font-semibold text-ink-900">Client-ready profile</p>
        {[
          ["Name", showName, setShowName],
          ["Contact details", showContact, setShowContact],
          ["CTC", showCtc, setShowCtc],
          ["Current company", showCompany, setShowCompany],
        ].map(([label, val, set]: any) => (
          <label key={label} className="flex items-center gap-1.5 text-[13px] text-ink-700">
            <input type="checkbox" checked={val} onChange={(e) => set(e.target.checked)} className="h-4 w-4 accent-[rgb(var(--jade))]" />
            {label}
          </label>
        ))}
        <Button size="sm" className="ml-auto" onClick={() => window.print()}>
          <Printer className="h-4 w-4" /> Print / Save PDF
        </Button>
      </div>

      <article className="mx-auto max-w-[820px] bg-white px-10 py-10 text-[#172036] shadow-pop print:max-w-none print:px-0 print:py-0 print:shadow-none" style={{ colorScheme: "light" }}>
        <header className="flex items-start justify-between border-b-2 border-[#0F766E] pb-5">
          <div>
            <p className="text-[28px] font-semibold leading-tight tracking-tight">{showName ? name : `Candidate ${c.candidate_code}`}</p>
            <p className="mt-1 text-[15px] text-[#42506B]">{c.headline || c.current_designation}</p>
            {showContact && (
              <p className="mt-2 text-[13px] text-[#42506B]">{[c.email, c.phone, c.linkedin_url].filter(Boolean).join("  ·  ")}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-right">
            <div>
              <p className="text-sm font-semibold">{APP_NAME}</p>
              <p className="text-[11px] text-[#7A849C]">Ref {c.candidate_code}</p>
            </div>
            <LogoMark size={34} />
          </div>
        </header>

        <section className="mt-6 grid grid-cols-4 gap-px overflow-hidden rounded-lg border border-[#E3E6EC] bg-[#E3E6EC]">
          {[
            ["Experience", years(c.total_experience)],
            ["Notice period", c.serving_notice && c.last_working_day ? `LWD ${formatDate(c.last_working_day)}` : noticeLabel(c.notice_period_days)],
            ["Location", [c.current_city, c.willing_to_relocate ? "(open to relocate)" : null].filter(Boolean).join(" ") || "—"],
            showCtc ? ["Current / Expected", `${lpa(c.current_ctc)} / ${lpa(c.expected_ctc)}`] : ["Qualification", c.highest_qualification ?? "—"],
          ].map(([k, v]) => (
            <div key={k} className="bg-white px-4 py-3">
              <p className="text-[11px] text-[#7A849C]">{k}</p>
              <p className="mt-0.5 text-[14px] font-semibold">{v}</p>
            </div>
          ))}
        </section>

        {c.summary && (
          <Block title="Profile summary">
            <p className="whitespace-pre-wrap text-[13.5px] leading-relaxed text-[#2D3751]">{c.summary}</p>
          </Block>
        )}

        {skills.length > 0 && (
          <Block title="Key skills">
            <div className="flex flex-wrap gap-1.5">
              {skills.map((s: any) => (
                <span key={s.skill.id} className="rounded border border-[#D0D5DF] px-2 py-0.5 text-[12.5px]">
                  {s.skill.name}
                  {s.years ? <span className="text-[#7A849C]"> · {Number(s.years)}y</span> : null}
                </span>
              ))}
            </div>
          </Block>
        )}

        {(c.candidate_experiences ?? []).length > 0 && (
          <Block title="Work experience">
            <div className="space-y-4">
              {c.candidate_experiences.map((e: any, i: number) => (
                <div key={e.id} className="break-inside-avoid">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-[14px] font-semibold">
                      {e.designation}
                      {(showCompany || i > 0 || !e.is_current) && <span className="font-normal text-[#42506B]"> — {e.company}</span>}
                      {!showCompany && i === 0 && e.is_current && <span className="font-normal text-[#42506B]"> — Current employer</span>}
                    </p>
                    <p className="shrink-0 text-[12px] text-[#7A849C]">
                      {formatDate(e.start_date, { month: "short", year: "numeric" })} – {e.is_current ? "Present" : formatDate(e.end_date, { month: "short", year: "numeric" })}
                    </p>
                  </div>
                  {e.responsibilities && <p className="mt-1 whitespace-pre-wrap text-[13px] leading-relaxed text-[#2D3751]">{e.responsibilities}</p>}
                </div>
              ))}
            </div>
          </Block>
        )}

        {(c.candidate_projects ?? []).length > 0 && (
          <Block title="Projects">
            <div className="space-y-3">
              {c.candidate_projects.map((p: any) => (
                <div key={p.id} className="break-inside-avoid">
                  <p className="text-[13.5px] font-semibold">
                    {p.title} {p.role && <span className="font-normal text-[#42506B]">· {p.role}</span>}
                  </p>
                  {p.technologies && <p className="text-[12px] text-[#7A849C]">{p.technologies}</p>}
                  {p.description && <p className="mt-0.5 text-[13px] text-[#2D3751]">{p.description}</p>}
                </div>
              ))}
            </div>
          </Block>
        )}

        <div className="grid grid-cols-2 gap-8">
          {(c.candidate_educations ?? []).length > 0 && (
            <Block title="Education">
              <div className="space-y-2">
                {c.candidate_educations.map((e: any) => (
                  <div key={e.id}>
                    <p className="text-[13.5px] font-semibold">{[e.degree, e.specialization].filter(Boolean).join(", ") || e.level}</p>
                    <p className="text-[12px] text-[#7A849C]">{[e.institute, e.end_year].filter(Boolean).join(" · ")}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}
          {(c.candidate_certifications ?? []).length > 0 && (
            <Block title="Certifications">
              <div className="space-y-2">
                {c.candidate_certifications.map((e: any) => (
                  <div key={e.id}>
                    <p className="text-[13.5px] font-semibold">{e.name}</p>
                    <p className="text-[12px] text-[#7A849C]">{[e.issuer, e.issue_date && formatDate(e.issue_date, { month: "short", year: "numeric" })].filter(Boolean).join(" · ")}</p>
                  </div>
                ))}
              </div>
            </Block>
          )}
        </div>

        <Block title="Preferences">
          <p className="text-[13px] text-[#2D3751]">
            {[
              c.preferred_locations?.length ? `Preferred: ${c.preferred_locations.join(", ")}` : null,
              c.work_mode_preference ? `Work mode: ${c.work_mode_preference}` : null,
              c.job_type_preference ? `Job type: ${c.job_type_preference}` : null,
              (c.languages ?? []).length ? `Languages: ${c.languages.join(", ")}` : null,
            ]
              .filter(Boolean)
              .join("   ·   ") || "—"}
          </p>
        </Block>

        <footer className="mt-10 flex justify-between border-t border-[#E3E6EC] pt-3 text-[11px] text-[#7A849C]">
          <span>Prepared by {preparedBy}</span>
          <span>{formatDate(todayIST())}</span>
        </footer>
      </article>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-7">
      <h2 className="mb-2.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#0F766E]">{title}</h2>
      {children}
    </section>
  );
}
