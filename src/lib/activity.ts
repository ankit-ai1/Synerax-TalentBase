const FIELD_LABELS: Record<string, string> = {
  first_name: "First name",
  middle_name: "Middle name",
  last_name: "Last name",
  dob: "DOB",
  email: "Email",
  phone: "Phone",
  status: "Status",
  current_ctc: "Current CTC",
  expected_ctc: "Expected CTC",
  notice_period_days: "Notice period",
  last_working_day: "Last working day",
  total_experience: "Total experience",
  current_company: "Current company",
  current_designation: "Designation",
  current_city: "City",
  rating: "Rating",
  tags: "Tags",
  is_archived: "Archived",
  serving_notice: "Serving notice",
  available_from: "Available from",
  bgv_status: "BGV",
  source: "Source",
};

export function fieldLabel(k: string) {
  return FIELD_LABELS[k] ?? k.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function fmtValue(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (Array.isArray(v)) return v.length ? v.join(", ") : "—";
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return String(v);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function describeActivity(a: { action: string; details: any }) {
  const d = a.details ?? {};
  switch (a.action) {
    case "created":
      return `added ${d.name ?? "a candidate"}`;
    case "updated": {
      const keys = Object.keys(d.changes ?? {});
      const shown = keys.slice(0, 3).map(fieldLabel).join(", ");
      return `updated ${d.name ?? "a profile"}${shown ? ` (${shown}${keys.length > 3 ? ` +${keys.length - 3}` : ""})` : ""}`;
    }
    case "status_changed":
      return `changed ${d.name ?? ""}'s status from ${fmtValue(d.changes?.status?.from)} to ${fmtValue(d.changes?.status?.to)}`;
    case "archived":
      return `archived ${d.name ?? "a candidate"}`;
    case "restored":
      return `restored ${d.name ?? "a candidate"}`;
    case "deleted":
      return `deleted ${d.name ?? "a candidate"} (${d.code ?? ""})`;
    case "document_uploaded":
      return `uploaded a ${d.type ?? "document"}: ${d.file ?? ""}`;
    case "document_archived":
      return `archived a document: ${d.file ?? ""}`;
    case "document_deleted":
      return `deleted a document: ${d.file ?? ""}`;
    case "added_to_job":
      return `added ${d.name ?? "a candidate"} to the ${d.job ?? "job"} pipeline`;
    case "stage_changed":
      return `moved ${d.name ?? "a candidate"} from ${d.from ?? ""} to ${d.to ?? ""} (${d.job ?? "job"})`;
    case "removed_from_job":
      return `removed a candidate from the ${d.job ?? "job"} pipeline`;
    case "interview_scheduled":
      return `scheduled a ${d.round ?? ""} interview for ${d.name ?? "a candidate"} (${d.job ?? ""})`;
    case "interview_result":
      return `recorded ${d.name ?? "a candidate"}'s ${d.round ?? ""} round result: ${d.result ?? ""}`;
    case "job_created":
      return `created a new job: ${d.job ?? ""}`;
    case "job_status":
      return `changed ${d.job ?? "job"} status from ${d.from ?? ""} to ${d.to ?? ""}`;
    case "client_created":
      return `added a new client: ${d.client ?? ""}`;
    case "note_added":
      return `added a note: “${d.preview ?? ""}”`;
    default:
      return a.action;
  }
}
