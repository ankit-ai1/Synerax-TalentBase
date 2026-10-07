export interface Filters {
  q: string;
  skills: string[];
  skill_mode: "any" | "all";
  min_skill_years: string;
  job_roles: string[];
  statuses: string[];
  locations: string[];
  exp_min: string;
  exp_max: string;
  cur_ctc_min: string;
  cur_ctc_max: string;
  exp_ctc_min: string;
  exp_ctc_max: string;
  notice_max: string;
  join_by: string;
  work_mode: string;
  job_type: string;
  gender: string;
  qualification: string;
  source: string;
  relocate: string;
  serving_notice: string;
  tag: string;
  archived: string;
  shortlist_id: string;
  in_job: string;
  portal: string;
  completion_min: string;
  added_by: string;
  added_from: string;
  ids: string[];
  sort: string;
  page: string;
}

export const emptyFilters = (): Filters => ({
  q: "",
  skills: [],
  skill_mode: "any",
  min_skill_years: "",
  job_roles: [],
  statuses: [],
  locations: [],
  exp_min: "",
  exp_max: "",
  cur_ctc_min: "",
  cur_ctc_max: "",
  exp_ctc_min: "",
  exp_ctc_max: "",
  notice_max: "",
  join_by: "",
  work_mode: "",
  job_type: "",
  gender: "",
  qualification: "",
  source: "",
  relocate: "",
  serving_notice: "",
  tag: "",
  archived: "",
  shortlist_id: "",
  in_job: "",
  portal: "",
  completion_min: "",
  added_by: "",
  added_from: "",
  ids: [],
  sort: "relevance",
  page: "1",
});

const ARRAYS = ["skills", "job_roles", "statuses", "locations", "ids"] as const;

export function parseFilters(sp: URLSearchParams | Record<string, string | string[] | undefined>): Filters {
  const get = (k: string): string => {
    if (sp instanceof URLSearchParams) return sp.get(k) ?? "";
    const v = sp[k];
    return Array.isArray(v) ? v[0] ?? "" : v ?? "";
  };
  const f = emptyFilters() as unknown as Record<string, unknown>;
  for (const k of Object.keys(f)) {
    const v = get(k);
    if (!v) continue;
    if ((ARRAYS as readonly string[]).includes(k)) f[k] = v.split(",").map((x) => x.trim()).filter(Boolean);
    else f[k] = v;
  }
  return f as unknown as Filters;
}

export function toQueryString(f: Filters) {
  const def = emptyFilters() as unknown as Record<string, unknown>;
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) {
    if (Array.isArray(v)) {
      if (v.length) p.set(k, v.join(","));
    } else if (v && v !== def[k]) p.set(k, v);
  }
  return p.toString();
}

/** Payload for the RPC */
export function toRpc(f: Filters, pageSize = 20) {
  return { ...f, page: Number(f.page) || 1, page_size: pageSize };
}

export function activeFilterCount(f: Filters) {
  const def = emptyFilters() as unknown as Record<string, unknown>;
  let n = 0;
  for (const [k, v] of Object.entries(f)) {
    if (["q", "sort", "page", "skill_mode"].includes(k)) continue;
    if (Array.isArray(v) ? v.length : v && v !== def[k]) n++;
  }
  return n;
}
