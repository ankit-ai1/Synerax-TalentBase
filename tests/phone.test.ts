// npm run test:phone
import { test } from "node:test";
import assert from "node:assert/strict";
import { cvPhone, displayPhone, isValidPhone, normalizeLoosePhone, normalizePhone, parsePhone, phoneError, phoneSearchDigits, phoneVariants, telHref, waNumber } from "../src/lib/phone";

const VALID: [string, string, string][] = [
  // input, E.164, country
  ["9876543210", "+919876543210", "IN"],
  ["+91 98765 43210", "+919876543210", "IN"],
  ["+971 501744908", "+971501744908", "AE"],
  ["00971 50 174 4908", "+971501744908", "AE"],
  ["+966 50 123 4567", "+966501234567", "SA"],
  ["+974 3312 3456", "+97433123456", "QA"],
  ["+1 (415) 555-2671", "+14155552671", "US"],
  ["+44 7400 123456", "+447400123456", "GB"],
  ["+65 8123 4567", "+6581234567", "SG"],
  ["+977 984-1234567", "+9779841234567", "NP"],
  ["+91 11 2345 6789", "+911123456789", "IN"], // fixed line
];

const INVALID = ["12345", "0000000000", "+971 12", "+966 12", "+974 1234", "+1 123 456 7890", "+44 12", "+65 1234", "+977 12345", "+91 98765"];

test("valid numbers in every country parse to E.164", () => {
  for (const [input, e164, iso] of VALID) {
    assert.equal(isValidPhone(input), true, input);
    assert.equal(normalizePhone(input), e164, input);
    assert.equal(parsePhone(input).iso, iso, input);
    assert.equal(phoneError(input), null, input);
  }
});

test("invalid numbers are rejected with a country-specific message", () => {
  for (const input of INVALID) assert.equal(isValidPhone(input), false, input);
  assert.equal(phoneError("+971 12"), "Enter a valid mobile number for United Arab Emirates");
  assert.equal(phoneError(""), null);
});

test("display, tel: and WhatsApp use the full international number", () => {
  assert.equal(displayPhone("+971501744908"), "+971 50 174 4908");
  assert.equal(displayPhone("9876543210"), "+91 98765 43210"); // legacy row
  assert.equal(telHref("+971501744908"), "tel:+971501744908");
  assert.equal(waNumber("9876543210"), "919876543210");
  assert.equal(waNumber("+971501744908"), "971501744908");
});

test("search and duplicate helpers", () => {
  assert.equal(phoneSearchDigits("+971 50 174 4908"), "501744908");
  assert.equal(phoneSearchDigits("98765-43210"), "9876543210");
  assert.equal(phoneSearchDigits("rahul"), null);
  assert.deepEqual(phoneVariants("9876543210"), ["+919876543210", "9876543210"]);
  assert.deepEqual(phoneVariants("+971501744908"), ["+971501744908"]);
});

test("CV / spreadsheet numbers: explicit code wins, India by default", () => {
  assert.equal(normalizeLoosePhone("971501744908"), "+971501744908");
  assert.equal(normalizeLoosePhone("9876543210"), "+919876543210");
  assert.equal(normalizeLoosePhone("+44 7911 123456"), "+447911123456");
  assert.equal(cvPhone("+971 50 174 4908"), "+971501744908");
  assert.equal(cvPhone("+1 415 555 2671"), "+14155552671");
  assert.equal(cvPhone("098765 43210"), "+919876543210");
  assert.equal(cvPhone("+971 12"), null);
});
