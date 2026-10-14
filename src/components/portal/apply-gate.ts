import type { Completion } from "@/lib/portal-types";

/** minimum profile completion for one-click apply (app_settings, default 80) — candidate_apply enforces the same */
export const applyThreshold = (c: Completion) => c.threshold ?? 80;
export const canApply = (c: Completion) => c.percent >= applyThreshold(c);
