import { Container } from "./ui";

/** Simple layout for legal pages. All legal text is a placeholder pending legal review. */
export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { heading: string; body: string[] }[] }) {
  return (
    <Container className="max-w-3xl py-16 sm:py-24">
      <p className="text-[13px] font-semibold uppercase tracking-[0.14em] text-jade-700">Legal</p>
      <h1 className="mt-3 text-[34px] font-semibold tracking-[-0.03em] text-ink-900 sm:text-[44px]">{title}</h1>
      <p className="mt-2 text-sm text-ink-400">Last updated: {updated}</p>
      <div className="mt-6 rounded-2xl border border-dashed border-saffron/60 bg-saffron-50 p-4 text-[14px] text-saffron-800" role="note">
        This page contains placeholder text and is pending legal review. It is not yet a binding policy.
      </div>
      <div className="mt-10 space-y-10">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-xl font-semibold text-ink-900">{s.heading}</h2>
            {s.body.map((p) => (
              <p key={p} className="mt-3 text-[15.5px] leading-relaxed text-ink-600">
                {p}
              </p>
            ))}
          </section>
        ))}
      </div>
    </Container>
  );
}
