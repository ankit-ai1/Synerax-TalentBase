// npm run test:unit — completion gate helpers (the database enforces the same rule in candidate_apply)
import { test } from "node:test";
import assert from "node:assert/strict";
import { friendlyError, parseProfileIncomplete } from "../src/lib/utils";
import { applyThreshold, canApply } from "../src/components/portal/apply-gate";
import { checkImportRow, registrationSchema, staffCandidateSchema } from "../src/lib/candidate-schema";

const raised = `PROFILE_INCOMPLETE: {"percent": 72, "threshold": 80, "missing": [{"key": "cv", "label": "CV / resume", "section": "documents"}]}`;

test("PROFILE_INCOMPLETE from candidate_apply is parsed and explained", () => {
  assert.deepEqual(parseProfileIncomplete(raised), { percent: 72, threshold: 80, missing: [{ key: "cv", label: "CV / resume", section: "documents" }] });
  assert.equal(friendlyError(raised), "Complete your profile (72% → 80%) to apply. Missing: CV / resume.");
  assert.equal(parseProfileIncomplete("VALIDATION: something else"), null);
});

test("apply is allowed only at or above the threshold (default 80)", () => {
  const base = { missing: [], optional: [] };
  assert.equal(canApply({ ...base, percent: 79 }), false);
  assert.equal(canApply({ ...base, percent: 80 }), true);
  assert.equal(canApply({ ...base, percent: 64, threshold: 60 }), true);
  assert.equal(applyThreshold({ ...base, percent: 10 }), 80);
});

test("one schema: registration and staff share the field rules", () => {
  const reg = registrationSchema.safeParse({
    full_name: "Asha Rao", email: "ASHA@EXAMPLE.COM", phone: "+971 501744908", current_city: "Dubai", exp_years: 3, exp_months: 0,
    current_designation: "QA Engineer", skills: ["Java", "SQL", "Selenium"], current_ctc: 10, expected_ctc: 14, notice_period_days: 30,
    serving_notice: false, last_working_day: "", consent: true,
  });
  assert.equal(reg.success, true);
  assert.equal(reg.success && reg.data.phone, "+971501744908");
  assert.equal(reg.success && reg.data.email, "asha@example.com");

  const staffBad = staffCandidateSchema.safeParse({ first_name: "Asha", email: "", phone: "+971 12", alt_phone: "", whatsapp: "", alt_email: "" });
  assert.equal(staffBad.success, false);
  const staffOk = staffCandidateSchema.safeParse({ first_name: "Asha", email: "", phone: "9876543210", alt_phone: "", whatsapp: "", alt_email: "", extra: 1 });
  assert.equal(staffOk.success && staffOk.data.phone, "+919876543210");
  assert.equal(staffOk.success && (staffOk.data as Record<string, unknown>).extra, 1); // staff-only fields pass through

  assert.equal(checkImportRow({ first_name: "A", phone: "+971 501744908" }), null);
  assert.equal(checkImportRow({ first_name: "A", phone: "12" }), "Invalid phone");
  assert.equal(checkImportRow({ first_name: "", email: "a@b.co" }), "First name is missing");
});
