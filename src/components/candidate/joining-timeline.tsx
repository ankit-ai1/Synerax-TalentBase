import { addDays, cn, daysUntil, formatDate, noticeLabel, todayIST } from "@/lib/utils";

/**
 * When the candidate can join — a visual from today to joining.
 * The most important question on a profile: "when are they available?"
 */
export function JoiningTimeline({
  noticeDays,
  servingNotice,
  lastWorkingDay,
  availableFrom,
  currentlyEmployed,
}: {
  noticeDays: number | null;
  servingNotice: boolean;
  lastWorkingDay: string | null;
  availableFrom: string | null;
  currentlyEmployed: boolean;
}) {
  const lwdIn = daysUntil(lastWorkingDay);
  let joinIn = daysUntil(availableFrom);
  let joinSource = "Available from";
  if (joinIn === null && lwdIn !== null) {
    joinIn = lwdIn + 1;
    joinSource = "After LWD";
  }
  if (joinIn === null && noticeDays !== null) {
    joinIn = noticeDays;
    joinSource = servingNotice ? "As per notice" : "If they resign today";
  }
  if (!currentlyEmployed && joinIn === null) {
    joinIn = 0;
    joinSource = "Not currently employed";
  }

  const immediate = joinIn !== null && joinIn <= 0;
  const span = Math.max(joinIn ?? 0, lwdIn ?? 0, 30);
  const pos = (d: number | null) => (d === null ? null : Math.min(100, Math.max(0, (d / span) * 100)));
  const joinPos = pos(joinIn);
  const lwdPos = pos(lwdIn);

  const showLwd = lwdIn !== null && lwdIn >= 0;
  // if both markers are close together, merge labels so they don't overlap
  const mergeLabels = showLwd && joinPos !== null && lwdPos !== null && Math.abs(joinPos - lwdPos) < 18;
  const short = (d: string) => formatDate(d, { day: "numeric", month: "short" });

  const headline =
    joinIn === null
      ? "Joining date unknown"
      : immediate
        ? "Can join immediately"
        : `Can join in ${joinIn} days`;

  return (
    <div className="rounded-xl border border-line bg-surface p-5 shadow-card">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-[13px] text-ink-400">Availability</p>
          <p className={cn("text-lg font-semibold tracking-tight", immediate ? "text-jade-700" : "text-ink-800")}>{headline}</p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-1 text-[13px] text-ink-500">
          <span>
            Notice: <b className="font-medium text-ink-800">{noticeLabel(noticeDays)}</b>
          </span>
          {servingNotice && <span className="font-medium text-saffron-800">Serving notice</span>}
        </div>
      </div>

      {joinIn !== null && (
        <div className="mt-6 pb-8">
          <div className="relative h-2 rounded-full bg-canvas">
            <div
              className={cn("absolute inset-y-0 left-0 rounded-full", immediate ? "bg-jade" : "bg-gradient-to-r from-saffron-100 to-saffron")}
              style={{ width: `${joinPos ?? 0}%` }}
            />
            <Marker pos={0} label="Today" sub={short(todayIST())} align="start" />
            {showLwd && lwdPos !== null && lastWorkingDay && (
              <Marker
                pos={lwdPos}
                label={mergeLabels ? "Last day, then join" : "Last day"}
                sub={short(lastWorkingDay)}
                tone="saffron"
                align={lwdPos > 80 ? "end" : "center"}
              />
            )}
            {!immediate && joinPos !== null && !mergeLabels && (
              <Marker
                pos={joinPos}
                label="Joining"
                sub={short(availableFrom ?? addDays(todayIST(), joinIn ?? 0))}
                tone="jade"
                align={joinPos > 80 ? "end" : "center"}
              />
            )}
          </div>
          <p className="sr-only">{joinSource}</p>
        </div>
      )}
      {lwdIn !== null && lwdIn < 0 && lastWorkingDay && (
        <p className="mt-3 text-[13px] text-ink-500">
          The last working day ({formatDate(lastWorkingDay)}) has passed — the candidate may be free now. Please confirm.
        </p>
      )}
    </div>
  );
}

function Marker({
  pos,
  label,
  sub,
  tone = "ink",
  align = "center",
}: {
  pos: number;
  label: string;
  sub: string;
  tone?: "ink" | "jade" | "saffron";
  align?: "start" | "center" | "end";
}) {
  const dot = { ink: "bg-ink-800", jade: "bg-jade", saffron: "bg-saffron" }[tone];
  return (
    <div className="absolute top-1/2" style={{ left: `${pos}%` }}>
      <span className={cn("absolute h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow", dot)} />
      <div
        className={cn(
          "absolute top-3 whitespace-nowrap text-[11px] leading-tight",
          align === "start" ? "-translate-x-1" : align === "end" ? "-translate-x-full" : "-translate-x-1/2 text-center"
        )}
      >
        <p className="font-medium text-ink-700">{label}</p>
        <p className="text-ink-400">{sub}</p>
      </div>
    </div>
  );
}
