"use client";

import { useState } from "react";
import { Check, Clock, Copy, Mail, MapPin, Phone } from "lucide-react";
import { toast } from "sonner";
import { site } from "@/content/site";
import { SpotlightCard } from "./cards";

function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          toast.success(`${label} copied`);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          toast.error("Couldn't copy — please copy it manually.");
        }
      }}
      aria-label={`Copy ${label.toLowerCase()}`}
      className="relative z-10 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-line text-ink-400 transition-colors hover:border-jade/40 hover:text-jade-700"
    >
      {copied ? <Check className="h-4 w-4 text-jade" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />}
    </button>
  );
}

function InfoCard({ icon, title, children, copy }: { icon: React.ReactNode; title: string; children: React.ReactNode; copy?: { value: string; label: string } }) {
  return (
    <SpotlightCard className="lift p-5">
      <div className="relative z-10 flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-jade-50 text-jade-700 ring-1 ring-inset ring-jade/15">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="text-[12.5px] font-medium text-ink-400">{title}</p>
          <div className="mt-0.5 text-[15px] font-medium text-ink-900">{children}</div>
        </div>
        {copy && <CopyButton {...copy} />}
      </div>
    </SpotlightCard>
  );
}

export function ContactCards() {
  const c = site.contact;
  return (
    <div className="grid gap-3">
      <InfoCard icon={<Mail className="h-5 w-5" aria-hidden />} title="Email" copy={{ value: c.email, label: "Email" }}>
        <a href={`mailto:${c.email}`} className="break-all hover:text-jade-700">
          {c.email}
        </a>
      </InfoCard>
      <InfoCard icon={<Phone className="h-5 w-5" aria-hidden />} title="Phone" copy={{ value: c.phone, label: "Phone number" }}>
        <a href={`tel:${c.phone.replace(/\s/g, "")}`} className="hover:text-jade-700">
          {c.phone}
        </a>
      </InfoCard>
      <InfoCard icon={<MapPin className="h-5 w-5" aria-hidden />} title="Office" copy={{ value: c.address.join(", "), label: "Address" }}>
        <address className="not-italic">
          {c.address.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </address>
      </InfoCard>
      <InfoCard icon={<Clock className="h-5 w-5" aria-hidden />} title="Business hours">
        <dl className="mt-1 space-y-1 text-[14px] font-normal">
          {c.hours.map((h) => (
            <div key={h.days} className="flex justify-between gap-4">
              <dt className="text-ink-500">{h.days}</dt>
              <dd className="text-right font-medium text-ink-800">{h.time}</dd>
            </div>
          ))}
        </dl>
      </InfoCard>
    </div>
  );
}

/** Stylised dark "map" with a pulsing pin (placeholder until a real embed URL is set) */
export function MapGraphic() {
  const c = site.contact;
  if (c.mapEmbedUrl) {
    return (
      <div className="card-premium overflow-hidden">
        <iframe src={c.mapEmbedUrl} title="Office location map" className="h-64 w-full border-0" loading="lazy" referrerPolicy="no-referrer-when-downgrade" />
      </div>
    );
  }
  return (
    <div className="section-dark card-premium relative h-64 overflow-hidden" role="img" aria-label="Stylised map showing our office location">
      <svg className="absolute inset-0 h-full w-full text-fg/[0.07]" viewBox="0 0 400 260" preserveAspectRatio="xMidYMid slice" aria-hidden>
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={`h${i}`} x1="0" y1={i * 20} x2="400" y2={i * 20 + 30} stroke="currentColor" />
        ))}
        {Array.from({ length: 22 }).map((_, i) => (
          <line key={`v${i}`} x1={i * 20} y1="0" x2={i * 20 - 40} y2="260" stroke="currentColor" />
        ))}
        <path d="M-10 170 C 80 140, 140 200, 220 150 S 340 90, 420 120" fill="none" stroke="rgb(var(--jade) / 0.5)" strokeWidth="6" />
        <path d="M60 -10 C 90 80, 70 160, 120 270" fill="none" stroke="rgb(var(--fg) / 0.12)" strokeWidth="4" />
        <path d="M300 -10 C 280 90, 320 170, 290 270" fill="none" stroke="rgb(var(--fg) / 0.12)" strokeWidth="4" />
      </svg>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <span className="pulse-ring absolute inset-0 rounded-full bg-jade/50" aria-hidden />
        <span className="pulse-ring absolute inset-0 rounded-full bg-jade/40 [animation-delay:1.1s]" aria-hidden />
        <span className="relative flex h-12 w-12 items-center justify-center rounded-full bg-jade text-white shadow-glow">
          <MapPin className="h-6 w-6" aria-hidden />
        </span>
      </div>
      <div className="glass absolute bottom-4 left-4 rounded-xl px-3 py-2">
        <p className="text-[13px] font-semibold text-ink-900">{site.name} office</p>
        <p className="text-[11.5px] text-ink-500">{c.address[0]}</p>
      </div>
    </div>
  );
}
