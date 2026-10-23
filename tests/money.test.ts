// npm run test:unit — currencies, salary display and parsing
import { test } from "node:test";
import assert from "node:assert/strict";
import { extractCtc } from "../src/lib/resume/rules";
import { CURRENCIES, PINNED_CURRENCIES, budgetLabel, importSalary, ctcLabel, currencyForCountry, defaultCurrency, defaultPeriod, moneyFrom, moneyLabel, parseMoney, rangeLabel, searchCurrencies, toLpa } from "../src/lib/money";

test("ISO 4217 list: unique codes, pinned ones exist, every code has a flag country", () => {
  const codes = CURRENCIES.map((c) => c.code);
  assert.equal(new Set(codes).size, codes.length);
  assert.ok(codes.length >= 150);
  for (const p of PINNED_CURRENCIES) assert.ok(codes.includes(p), p);
  assert.ok(CURRENCIES.every((c) => /^[A-Z]{3}$/.test(c.code) && c.countries[0]?.length === 2));
});

test("search by code, name, alias and country", () => {
  const names: Record<string, string> = { AE: "United Arab Emirates", JP: "Japan" };
  assert.equal(searchCurrencies("dirham")[0].code, "AED");
  assert.equal(searchCurrencies("AED")[0].code, "AED");
  assert.equal(searchCurrencies("uae")[0].code, "AED");
  assert.equal(searchCurrencies("emirates", (i) => names[i] ?? "")[0].code, "AED");
  assert.ok(searchCurrencies("japan", (i) => names[i] ?? "").some((c) => c.code === "JPY"));
  assert.equal(searchCurrencies("").length, CURRENCIES.length);
});

test("defaults from country / phone; Gulf = monthly", () => {
  assert.equal(currencyForCountry("AE"), "AED");
  assert.equal(currencyForCountry("US"), "USD");
  assert.equal(currencyForCountry("DE"), "EUR");
  assert.equal(currencyForCountry("IN"), "INR");
  assert.equal(defaultCurrency({ phone: "+971501234567" }), "AED");
  assert.equal(defaultCurrency({ phone: "+919876543210" }), "INR");
  assert.equal(defaultCurrency({ country: "India", phone: "+971501234567" }), "AED"); // India is the default value of the column — phone wins
  assert.equal(defaultCurrency({ country: "Saudi Arabia" }), "SAR");
  assert.equal(defaultCurrency({}), "INR");
  assert.equal(defaultPeriod("AED"), "monthly");
  assert.equal(defaultPeriod("INR"), "annual");
  assert.equal(defaultPeriod("USD"), "annual");
});

test("display: INR LPA unchanged; others with symbol, separators and ≈ LPA hint", () => {
  assert.equal(moneyLabel({ amount: 12.5, currency: "INR", period: "annual", lpa: 12.5 }), "₹12.5 LPA");
  assert.equal(moneyLabel({ amount: 12, currency: "INR", period: "annual" }), "₹12 LPA");
  assert.equal(moneyLabel({ amount: 30550, currency: "AED", period: "monthly", lpa: 83.22 }), "AED 30,550 / month (≈ ₹83.2 LPA)");
  assert.equal(moneyLabel({ amount: 65000, currency: "USD", period: "annual", lpa: 54.21 }), "$65,000 / year (≈ ₹54.2 LPA)");
  assert.equal(moneyLabel({ amount: 50000, currency: "INR", period: "monthly", lpa: 6 }), "₹50,000 / month (≈ ₹6 LPA)");
  assert.equal(moneyLabel({ amount: 30550, currency: "AED", period: "monthly", lpa: 83.22 }, { hint: false }), "AED 30,550 / month");
  assert.equal(moneyLabel({ amount: null, lpa: null }), "—");
});

test("rows: legacy rows (no amount columns) still show ₹ LPA", () => {
  assert.equal(ctcLabel({ expected_ctc: 15 }, "expected_ctc"), "₹15 LPA");
  assert.equal(ctcLabel({ expected_ctc: 83.22, expected_ctc_amount: 30550, expected_ctc_currency: "AED", expected_ctc_period: "monthly" }, "expected_ctc"), "AED 30,550 / month (≈ ₹83.2 LPA)");
  assert.deepEqual(moneyFrom({ current_ctc: 9 }, "current_ctc"), { amount: 9, currency: "INR", period: "annual", lpa: 9 });
  assert.equal(budgetLabel({ ctc_min: 18, ctc_max: 30 }), "₹18–30 LPA");
  assert.equal(budgetLabel({ ctc_min: 57.6, ctc_max: 86.4, ctc_min_amount: 20000, ctc_max_amount: 30000, ctc_currency: "AED", ctc_period: "monthly" }), "AED 20,000–30,000 / month (≈ ₹57.6–86.4 LPA)");
  assert.equal(rangeLabel({ min: null, max: 25, currency: "INR", period: "annual" }), "Up to ₹25 LPA");
  assert.equal(rangeLabel({ min: 90000, max: null, currency: "USD", period: "annual" }, { hint: false }), "$90,000+ / year");
  assert.equal(budgetLabel({}), null);
});

test("parse: '30 AED', per-month text, k / lakh / crore, plain numbers", () => {
  assert.deepEqual(parseMoney("30 AED"), { amount: 30, currency: "AED", period: "monthly" });
  assert.deepEqual(parseMoney("AED 30,550 per month"), { amount: 30550, currency: "AED", period: "monthly" });
  assert.deepEqual(parseMoney("$120k"), { amount: 120000, currency: "USD", period: "annual" });
  assert.deepEqual(parseMoney("USD 8,000/month"), { amount: 8000, currency: "USD", period: "monthly" });
  assert.deepEqual(parseMoney("12 LPA"), { amount: 12, currency: "INR", period: "annual" });
  assert.deepEqual(parseMoney("12.5"), { amount: 12.5, currency: "INR", period: "annual" });
  assert.deepEqual(parseMoney("1.2 crore"), { amount: 120, currency: "INR", period: "annual" });
  assert.deepEqual(parseMoney("₹12,00,000"), { amount: 12, currency: "INR", period: "annual" });
  assert.deepEqual(parseMoney("Rs 50,000 per month"), { amount: 50000, currency: "INR", period: "monthly" });
  assert.deepEqual(parseMoney("SAR 15000"), { amount: 15000, currency: "SAR", period: "monthly" });
  assert.deepEqual(parseMoney("£55,000 per annum"), { amount: 55000, currency: "GBP", period: "annual" });
  assert.deepEqual(parseMoney("20000", "AED"), { amount: 20000, currency: "AED", period: "monthly" });
  assert.equal(parseMoney("negotiable"), null);
  assert.equal(parseMoney(""), null);
});

test("toLpa matches the database maths", () => {
  const rates = { AED: 22.7, USD: 83.4 };
  assert.equal(toLpa({ amount: 30550, currency: "AED", period: "monthly" }, rates), 83.22);
  assert.equal(toLpa({ amount: 65000, currency: "USD", period: "annual" }, rates), 54.21);
  assert.equal(toLpa({ amount: 12.5, currency: "INR", period: "annual" }, rates), 12.5);
  assert.equal(toLpa({ amount: 50000, currency: "INR", period: "monthly" }, rates), 6);
  assert.equal(toLpa({ amount: 100, currency: "XYZ", period: "annual" }, rates), null);
});

test("import: cell + Currency / Period columns", () => {
  assert.deepEqual(importSalary("14"), { amount: 14, currency: "INR", period: "annual" });
  assert.deepEqual(importSalary("1200000"), { amount: 12, currency: "INR", period: "annual" });
  assert.deepEqual(importSalary("30 AED"), { amount: 30, currency: "AED", period: "monthly" });
  assert.deepEqual(importSalary("12000", "AED", "Monthly"), { amount: 12000, currency: "AED", period: "monthly" });
  assert.deepEqual(importSalary("12000", "aed"), { amount: 12000, currency: "AED", period: "monthly" });
  assert.deepEqual(importSalary("90000", "USD"), { amount: 90000, currency: "USD", period: "annual" });
  assert.deepEqual(importSalary("90000", "dollar", "annual"), { amount: 90000, currency: "USD", period: "annual" });
  assert.deepEqual(importSalary("50000", "INR", "Monthly"), { amount: 50000, currency: "INR", period: "monthly" });
  assert.deepEqual(importSalary("$90k", "INR"), { amount: 90000, currency: "USD", period: "annual" }); // the cell's own currency wins
  assert.equal(importSalary(""), null);
  assert.equal(importSalary("n/a"), null);
});

test("resume parser: foreign-currency CTC comes through as text, INR stays in lakhs", () => {
  assert.deepEqual(extractCtc("Current CTC: AED 30,550 per month\nExpected CTC: 18 LPA"), { current_ctc_text: { value: "AED 30550 / month", confidence: "high" }, expected_ctc: { value: 18, confidence: "high" } });
  assert.deepEqual(extractCtc("Current salary: USD 85,000 per annum\nExpected salary: $95k").expected_ctc_text?.value, "USD 95000 / year");
  assert.deepEqual(extractCtc("Current CTC: 12 LPA\nExpected CTC: 16 lakhs"), { current_ctc: { value: 12, confidence: "high" }, expected_ctc: { value: 16, confidence: "high" } });
  assert.deepEqual(parseMoney("AED 30550 / month"), { amount: 30550, currency: "AED", period: "monthly" });
});
