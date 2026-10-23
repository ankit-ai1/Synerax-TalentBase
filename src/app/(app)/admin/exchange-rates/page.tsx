import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Card, CardHeader, EmptyState, PageHeader } from "@/components/ui/misc";
import { lpaLabel } from "@/lib/money";
import { RatesTable, type RateRow } from "./rates-table";

export const metadata = { title: "Exchange rates" };
export const dynamic = "force-dynamic";

type Review = { id: string; candidate_code: string | null; name: string; current_ctc: number | null; expected_ctc: number | null; mentions: string | null; note: string | null };

export default async function ExchangeRatesPage() {
  await requireAdmin();
  const supabase = await createClient();
  const [{ data: rates }, { data: review }, { count: foreign }] = await Promise.all([
    supabase.from("exchange_rates").select("currency, auto_rate, auto_source, auto_at, manual_rate, manual_at"),
    supabase.rpc("fx_review_candidates"),
    supabase.from("candidates").select("id", { count: "exact", head: true }).or("current_ctc_currency.neq.INR,expected_ctc_currency.neq.INR,current_ctc_period.eq.monthly,expected_ctc_period.eq.monthly"),
  ]);
  const list = (review ?? []) as Review[];
  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange rates"
        description="Salaries can be in any currency. Search, filters, sorting and job matching use an INR-per-year equivalent (LPA), refreshed daily at 09:00 IST from the ECB (via Frankfurter) and ExchangeRate-API. If the automatic rate is missing or older than 3 days, your manual rate is used."
      />
      <Card>
        <CardHeader title="Rates (₹ per 1 unit)" description={`${foreign ?? 0} candidate${foreign === 1 ? "" : "s"} have a salary in another currency or per month.`} />
        <RatesTable rows={(rates ?? []) as RateRow[]} />
      </Card>
      <Card>
        <CardHeader title="Candidates to review" description="Their salary is saved in INR, but their summary or notes mention another currency (AED, USD, dirham, riyal…). Open the profile and set the right currency and period." />
        {list.length === 0 ? (
          <EmptyState title="Nothing to review" description="No INR salaries with a foreign currency in the notes." compact />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-[13px]" data-testid="fx-review">
              <thead className="text-left text-[11.5px] uppercase tracking-wide text-ink-400">
                <tr className="border-b border-line">
                  <th className="px-5 py-2.5 font-medium">Candidate</th>
                  <th className="px-3 py-2.5 font-medium">Saved (INR)</th>
                  <th className="px-3 py-2.5 font-medium">Mentions</th>
                  <th className="px-3 py-2.5 font-medium">Note</th>
                  <th className="px-5 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {list.map((r) => (
                  <tr key={r.id}>
                    <td className="px-5 py-2.5">
                      <Link href={`/candidates/${r.id}`} className="font-medium text-ink-900 hover:text-jade-700">
                        {r.name || "—"}
                      </Link>
                      <span className="block text-[12px] text-ink-400">{r.candidate_code}</span>
                    </td>
                    <td className="px-3 py-2.5 text-ink-600">
                      {lpaLabel(r.current_ctc)} → {lpaLabel(r.expected_ctc)}
                    </td>
                    <td className="px-3 py-2.5 font-medium text-amber-700">{r.mentions}</td>
                    <td className="max-w-[320px] truncate px-3 py-2.5 text-[12.5px] text-ink-500" title={r.note ?? undefined}>
                      {r.note ?? "(in the summary)"}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/candidates/${r.id}/edit#compensation`} className="text-[12.5px] font-medium text-jade-700 hover:underline">
                        Fix salary
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
