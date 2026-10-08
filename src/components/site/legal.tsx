import { Container } from "./ui";
import { Silk } from "./silk";

/** Simple layout for legal pages. All legal text is a placeholder pending legal review. */
export function LegalPage({ title, updated, sections }: { title: string; updated: string; sections: { heading: string; body: string[] }[] }) {
  return (
    <>
      <section className="relative isolate -mt-16 overflow-clip bg-canvas pb-24 pt-36">
        <Silk focus={[0.8, 0.6]} amount={0.4} heat={0.2} />
        <Container className="relative">
          <p className="flex items-center gap-2.5 text-[13px] font-semibold uppercase tracking-[0.16em] text-jade-700">
            Legal
          </p>
          <h1 className="rise-line mt-4 text-[40px] font-semibold tracking-[-0.04em] text-ink-900 sm:text-[60px]">
            <span className="metal">{title}</span>
          </h1>
          <p className="mt-3 text-sm text-ink-500">Last updated: {updated}</p>
        </Container>
      </section>
      <section className="band band-light">
        <Container className="max-w-3xl py-16 sm:py-20">
          <div className="rounded-2xl border border-dashed border-saffron/60 bg-saffron-50 p-4 text-[14px] text-saffron-800" role="note">
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
      </section>
    </>
  );
}
